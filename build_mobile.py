import os
import sys
import subprocess
import shutil

def run_command(command, cwd=None):
    print(f"Running: {command}")
    res = subprocess.run(command, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"Error executing command: {command}")
        sys.exit(res.returncode)

def update_android_icons():
    icon_source = "deploy-temp/favicon.png"
    if not os.path.exists(icon_source):
        print(f"Warning: Source icon not found at {icon_source}")
        return

    try:
        from PIL import Image
    except ImportError:
        print("Installing Pillow for image manipulation...")
        run_command(f"{sys.executable} -m pip install pillow")
        from PIL import Image

    print("Updating Android launcher icons...")
    res_path = "android/app/src/main/res"
    if not os.path.exists(res_path):
        print("Warning: Android resource path not found.")
        return

    # Define mipmap folders and sizes: (folder_name, base_size, foreground_size)
    mipmaps = [
        ("mipmap-mdpi", 48, 108),
        ("mipmap-hdpi", 72, 162),
        ("mipmap-xhdpi", 96, 216),
        ("mipmap-xxhdpi", 144, 324),
        ("mipmap-xxxhdpi", 192, 432)
    ]

    img = Image.open(icon_source)

    for folder, base_sz, fore_sz in mipmaps:
        folder_path = os.path.join(res_path, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)

        # 1. Base and Round launcher icon
        img_base = img.resize((base_sz, base_sz), Image.Resampling.LANCZOS)
        img_base.save(os.path.join(folder_path, "ic_launcher.png"))
        img_base.save(os.path.join(folder_path, "ic_launcher_round.png"))

        # 2. Foreground adaptive icon (Centered with safe zone)
        img_fore = Image.new("RGBA", (fore_sz, fore_sz), (0, 0, 0, 0))
        target_w = int(fore_sz * 0.6)
        img_scaled = img.resize((target_w, target_w), Image.Resampling.LANCZOS)
        offset = (fore_sz - target_w) // 2
        img_fore.paste(img_scaled, (offset, offset), img_scaled if img_scaled.mode == 'RGBA' else None)
        img_fore.save(os.path.join(folder_path, "ic_launcher_foreground.png"))

    print("Android launcher icons successfully updated!")

def main():
    # 1. Run npm run build
    print("Building React frontend...")
    run_command("npm run build")

    # 2. Check if capacitor is installed
    package_json_path = "package.json"
    with open(package_json_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "@capacitor/core" not in content:
        print("Installing Capacitor dependencies...")
        run_command("npm install @capacitor/core @capacitor/cli")
        run_command("npm install @capacitor/android")

    # 3. Check if capacitor config exists, if not initialize
    if not os.path.exists("capacitor.config.json") and not os.path.exists("capacitor.config.ts"):
        print("Initializing Capacitor project...")
        config = """{
  "appId": "com.dalbitfox.netbox",
  "appName": "NetBox",
  "webDir": "dist",
  "server": {
    "androidScheme": "http",
    "allowNavigation": ["*"],
    "cleartext": true
  }
}"""
        with open("capacitor.config.json", "w", encoding="utf-8") as f:
            f.write(config)

    # 4. Check if android directory exists
    if not os.path.exists("android"):
        print("Adding Android platform...")
        run_command("npx cap add android")
    
    # Update icons inside Android resources folder
    update_android_icons()

    # 5. Sync project
    print("Syncing assets with Capacitor...")
    run_command("npx cap sync")

    # 6. Build APK
    print("Building Android APK via Gradle...")
    gradle_cmd = "gradlew.bat assembleDebug" if os.name == 'nt' else "./gradlew assembleDebug"
    run_command(gradle_cmd, cwd="android")

    # 7. Copy generated APK to public directory for hosting/downloading
    apk_source = os.path.join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    apk_dest = os.path.join("public", "netbox.apk")
    
    if os.path.exists(apk_source):
        shutil.copy(apk_source, apk_dest)
        print(f"\n==============================================")
        print(f"SUCCESS: Android APK generated at {apk_dest}!")
        print(f"Download link: /netbox.apk")
        print(f"==============================================")
    else:
        print("Error: Generated APK not found at target location.")
        sys.exit(1)

if __name__ == "__main__":
    main()
