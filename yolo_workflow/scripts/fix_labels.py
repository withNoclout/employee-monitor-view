import os
import glob

def fix_labels():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    classes_file = os.path.join(base_dir, 'classes.txt')
    raw_data_dir = os.path.join(base_dir, 'raw_data')

    # Load classes
    classes = []
    if os.path.exists(classes_file):
        with open(classes_file, 'r') as f:
            classes = [line.strip() for line in f.readlines() if line.strip()]

    print(f"Initial classes: {classes}")

    # Find all label files
    label_files = glob.glob(os.path.join(raw_data_dir, '*', 'labels', '*.txt'))
    
    for label_file in label_files:
        with open(label_file, 'r') as f:
            lines = f.readlines()
        
        new_lines = []
        modified = False
        
        for line in lines:
            parts = line.strip().split()
            if not parts:
                continue
            
            label = parts[0]
            coords = " ".join(parts[1:])
            
            # Check if label is a number
            if label.isdigit():
                new_lines.append(line.strip())
                continue
            
            # It's a string
            modified = True
            if label not in classes:
                classes.append(label)
                print(f"Added new class: {label}")
            
            class_idx = classes.index(label)
            new_lines.append(f"{class_idx} {coords}")
        
        if modified:
            with open(label_file, 'w') as f:
                f.write("\n".join(new_lines))
            print(f"Fixed {label_file}")

    # Save classes
    with open(classes_file, 'w') as f:
        f.write("\n".join(classes))
    print(f"Final classes: {classes}")

if __name__ == "__main__":
    fix_labels()
