from ultralytics import YOLO

# Load a model
model = YOLO("helmet.pt")

# Export the model
model.export(format="tfjs")
