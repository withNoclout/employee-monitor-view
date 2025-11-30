import json
import random
from datetime import datetime, timedelta
from faker import Faker

fake = Faker()

# Configuration
# Fixed "Now" time: Today at 11:30 AM
NOW = datetime.now().replace(hour=11, minute=30, second=0, microsecond=0)
SHIFT_START = NOW.replace(hour=8, minute=0, second=0, microsecond=0)

DEPARTMENTS = {
    "production": {
        "name": "Production Floor",
        "count": 25,
        "tasks": ["Assemble Component A", "Tighten Bolt M6", "Check Sensor Alignment", "Install PCB Board", "Weld Joint X-12", "Calibrate Servo Motor"],
        "vibe": "stress"
    },
    "assembly": {
        "name": "Assembly Line",
        "count": 40,
        "tasks": ["Fit Casing", "Connect Wiring Harness", "Apply Sealant", "Torque Screw Set", "Attach Label", "Final Assembly Check"],
        "vibe": "standard"
    },
    "maintenance": {
        "name": "Maintenance",
        "count": 12,
        "tasks": ["Lubricate Conveyor Belt", "Replace Hydraulic Filter", "Inspect Robot Arm", "Check Safety Guard", "Repair Drill Press", "Update Firmware"],
        "vibe": "standard"
    },
    "quality": {
        "name": "Quality Control",
        "count": 20,
        "tasks": ["Visual Inspection Lot #123", "Measure Gap Tolerance", "Verify Color Code", "Stress Test Sample", "Check Surface Finish"],
        "vibe": "precision"
    },
    "logistics": {
        "name": "Logistics",
        "count": 18,
        "tasks": ["Forklift Check", "Scan Incoming Goods", "Update Inventory Count", "Pack Shipment #554", "Organize Aisle 3", "Load Truck"],
        "vibe": "standard"
    },
    "warehouse": {
        "name": "Warehouse",
        "count": 15,
        "tasks": ["Stock Shelves", "Cycle Count", "Receive Raw Materials", "Pick Order #998", "Clean Storage Area"],
        "vibe": "variance"
    },
    "workforce": {
        "name": "General Workforce",
        "count": 30,
        "tasks": ["Clean Workstation", "Assist Assembly", "Move Scrap Bin", "Restock Supplies", "Safety Walkthrough", "General Support"],
        "vibe": "standard"
    }
}

def generate_performance(vibe):
    # Weighted distribution: 10% Low, 60% Avg, 30% High
    r = random.random()
    
    if vibe == "stress":
        # Production: Higher chance of low performance
        if r < 0.20: return random.randint(40, 69) # 20% Low
        if r < 0.70: return random.randint(70, 89) # 50% Avg
        return random.randint(90, 100)             # 30% High
    elif vibe == "precision":
        # QC: Mostly Good/Excellent
        if r < 0.05: return random.randint(50, 69) # 5% Low
        if r < 0.40: return random.randint(70, 89) # 35% Avg
        return random.randint(90, 100)             # 60% High
    else:
        # Standard
        if r < 0.10: return random.randint(40, 69)
        if r < 0.70: return random.randint(70, 89)
        return random.randint(90, 100)

def get_badge_status(performance):
    if performance < 70: return "needs-attention" # Attention
    if performance < 90: return "good"            # Good
    return "excellent"                            # Excellent

def get_task_count(dept_id, persona_name):
    # Base range depends on department nature
    if dept_id in ["production", "assembly"]:
        # High volume, repetitive tasks
        base_min, base_max = 15, 25
    elif dept_id in ["logistics", "warehouse"]:
        # Medium volume
        base_min, base_max = 10, 18
    elif dept_id in ["maintenance", "quality"]:
        # Low volume, complex tasks
        base_min, base_max = 5, 10
    else:
        # General
        base_min, base_max = 8, 15
        
    # Adjust by persona
    if persona_name == "Veteran":
        # Veterans handle more
        base_max += 3
    elif persona_name == "Rookie":
        # Rookies handle less
        base_max -= 2
        
    return random.randint(base_min, base_max)

def generate_mock_data():
    users = []
    
    for dept_id, dept_info in DEPARTMENTS.items():
        count = dept_info.get("count", 20)
        vibe = dept_info.get("vibe", "standard")
        
        # Track attention count to force overrides if needed
        attention_users = []
        
        for i in range(count):
            # 1. Attributes
            name = fake.name()
            user_id = f"emp-{dept_id[:3]}-{i+100}"
            performance = generate_performance(vibe)
            status = get_badge_status(performance)
            
            # State generation
            state_choices = ["working", "working", "working", "idle", "offline"] # Bias to active
            if status == "needs-attention":
                # Attention users more likely to be idle
                state_choices = ["working", "idle", "idle", "offline"]
            state = random.choice(state_choices)
            
            # Infer persona from performance for consistency
            if performance > 95: persona_name = "Veteran"
            elif performance < 75: persona_name = "Rookie"
            else: persona_name = "Average Joe"

            # 2. Hours Worked & Last Active
            # 3.5 hours passed (8:00 to 11:30)
            hours_worked = 3.5 - (random.random() * 1.0) # 2.5 to 3.5 hours
            
            if state == "working":
                last_active = "Just now"
            else:
                # Idle/Offline: 15-60 mins ago
                mins_ago = random.randint(15, 60)
                if vibe == "variance": mins_ago = random.randint(5, 120) # Warehouse variance
                last_active = f"{mins_ago} mins ago"

            # 3. Tasks
            num_tasks = get_task_count(dept_id, persona_name)
            
            # Recalculate completion ratio based on load
            # More tasks = harder to complete all
            completed_ratio = (performance / 100.0) * (hours_worked / 8.0) * 3.0 
            if dept_id in ["production", "assembly"]:
                completed_ratio *= 0.8 # Harder to keep up with high volume
            
            # Cap ratio at 1.0
            if completed_ratio > 0.95: completed_ratio = 0.95
            
            num_completed = int(num_tasks * completed_ratio)
            num_pending = num_tasks - num_completed
            
            user_tasks = []
            # Generate Completed Tasks
            for k in range(num_completed):
                user_tasks.append({
                    "id": f"task-{user_id}-c-{k}",
                    "name": random.choice(dept_info["tasks"]),
                    "status": "COMPLETED",
                    "assigned_at": (SHIFT_START + timedelta(minutes=random.randint(0, 120))).isoformat(),
                    "completed_at": (SHIFT_START + timedelta(minutes=random.randint(130, 200))).isoformat()
                })
            
            # Generate Pending/In-Progress Tasks
            for k in range(num_pending):
                t_status = "PENDING"
                if k == 0 and state == "working": t_status = "IN_PROGRESS"
                
                user_tasks.append({
                    "id": f"task-{user_id}-p-{k}",
                    "name": random.choice(dept_info["tasks"]),
                    "status": t_status,
                    "assigned_at": (NOW - timedelta(minutes=random.randint(5, 30))).isoformat(),
                    "completed_at": None
                })

            user = {
                "id": user_id,
                "name": name,
                "department": dept_id,
                "departmentName": dept_info["name"],
                "position": "Operator",
                "performanceScore": performance,
                "status": status, # This is the Badge
                "workingState": state,
                "lastActive": last_active,
                "hoursWorked": round(hours_worked, 1),
                "tasks": user_tasks,
                "pendingTasks": num_pending,
                "completedTasks": num_completed,
                "taskTimer": 0,
                "isReal": False
            }
            users.append(user)
            if status == "needs-attention": attention_users.append(user)

        # 4. Force Overrides (Post-generation check)
        if vibe == "stress" and len(attention_users) < 3:
            # Force more attention users in Production
            needed = 3 - len(attention_users)
            candidates = [u for u in users if u["status"] != "needs-attention" and not u["isReal"]]
            for _ in range(min(needed, len(candidates))):
                u = candidates.pop()
                u["performanceScore"] = random.randint(40, 69)
                u["status"] = "needs-attention"
                # Adjust state to likely idle
                u["workingState"] = random.choice(["idle", "offline"])
        
        if vibe == "precision" and len(attention_users) > 1:
            # Reduce attention users in QC
            to_fix = attention_users[1:] # Keep 1
            for u in to_fix:
                u["performanceScore"] = random.randint(75, 95)
                u["status"] = "good" if u["performanceScore"] < 90 else "excellent"

    return users

if __name__ == "__main__":
    data = generate_mock_data()
    with open("mock_employees.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"Generated {len(data)} lively users in mock_employees.json")
