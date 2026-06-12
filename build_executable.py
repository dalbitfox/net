import subprocess
import sys
import os
import shutil

def run_command(command, cwd=None):
    print(f"Running: {command}")
    res = subprocess.run(command, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"Error executing command: {command}")
        sys.exit(res.returncode)

def get_ico_path():
    icon_source = "deploy-temp/favicon.png"
    ico_dest = "deploy-temp/favicon.ico"
    
    if not os.path.exists(icon_source):
        print(f"Warning: Source icon not found at {icon_source}")
        return None

    try:
        from PIL import Image
    except ImportError:
        print("Installing Pillow for image conversion...")
        run_command(f"{sys.executable} -m pip install pillow")
        from PIL import Image

    print("Converting favicon.png to favicon.ico...")
    img = Image.open(icon_source)
    img.save(ico_dest, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    return os.path.abspath(ico_dest)

def main():
    # 1. Build React frontend
    print("Building React frontend...")
    run_command("npm run build")
    
    # Verify dist directory exists
    if not os.path.exists("dist"):
        print("Error: dist/ directory was not created by npm run build")
        sys.exit(1)

    # Clean up large binary files from dist before packaging to prevent recursion
    for filename in ["netbox.exe", "netbox.apk"]:
        binary_path = os.path.join("dist", filename)
        if os.path.exists(binary_path):
            print(f"Removing {binary_path} to prevent recursive packaging...")
            os.remove(binary_path)

    # 2. Check and install PyInstaller
    print("Checking for PyInstaller...")
    try:
        import PyInstaller
        print("PyInstaller is already installed.")
    except ImportError:
        print("Installing PyInstaller...")
        run_command("pip install pyinstaller")

    # 3. Clean up any previous build outputs
    for path in ["build-temp", "public/netbox.exe"]:
        if os.path.exists(path):
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)

    # 4. Compile standalone executable with PyInstaller
    print("Packaging application using PyInstaller...")
    
    ico_path = get_ico_path()
    
    # Path separator is ';' on Windows, ':' on macOS/Linux
    sep = ";" if os.name == "nt" else ":"
    dist_abs = os.path.abspath("dist")
    add_data_flag = f"{dist_abs}{sep}dist"
    
    icon_flag = f"--icon \"{ico_path}\" " if ico_path else ""
    
    pyinstaller_cmd = (
        f"pyinstaller --onefile --clean {icon_flag}"
        f"--add-data \"{add_data_flag}\" "
        f"--name netbox "
        f"--distpath public "
        f"--workpath build-temp "
        f"--specpath build-temp "
        f"api/server.py"
    )
    
    run_command(pyinstaller_cmd)
    
    print("\n==============================================")
    print("SUCCESS: Standalone executable 'netbox.exe' has been generated in the 'public' directory!")
    print("This file will be deployed with Vercel and downloadable at: /netbox.exe")
    print("==============================================")

if __name__ == "__main__":
    main()
