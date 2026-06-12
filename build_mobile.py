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
        print(f"\\n==============================================")
        print(f"SUCCESS: Android APK generated at {apk_dest}!")
        print(f"Download link: /netbox.apk")
        print(f"==============================================")
    else:
        print("Error: Generated APK not found at target location.")
        sys.exit(1)

if __name__ == "__main__":
    main()
