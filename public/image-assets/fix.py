import os
import subprocess

def validate_and_fix_image(image_path):
    try:
        # Check if the image is valid
        subprocess.run(['identify', image_path], check=True)
        print(f"{image_path} is valid.")
    except subprocess.CalledProcessError:
        print(f"{image_path} is invalid, attempting to fix...")
        try:
            # Attempt to fix the image by converting it
            subprocess.run(['convert', image_path, image_path], check=True)
            print(f"Fixed {image_path}.")
        except subprocess.CalledProcessError:
            print(f"Failed to fix {image_path}.")

def main():
    image_dir = '.'

    for filename in os.listdir(image_dir):
        if filename.endswith('.avif'):
            image_path = os.path.join(image_dir, filename)
            validate_and_fix_image(image_path)

if __name__ == "__main__":
    main()
