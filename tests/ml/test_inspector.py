import sys
import os

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from preprocessing.inspector import inspect_csv_bytes

def test_csv_inspection():
    csv_data = b"age,sex,income\n25,Male,<=50K\n30,Female,>50K\n"
    result = inspect_csv_bytes(csv_data, "test.csv")
    
    assert result["success"] == True
    assert result["dataset"]["rows"] == 2
    assert result["dataset"]["columns"] == 3
    assert result["dataset"]["columnNames"] == ["age", "sex", "income"]
    assert len(result["preview"]) == 2
    print("[PASS] Python ML Service CSV inspection unit test passed successfully!")

if __name__ == "__main__":
    test_csv_inspection()
