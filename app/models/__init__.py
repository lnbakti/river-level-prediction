# Register all models by importing them here
from app.models.user import User, UserRole, UserStatus, UserNotifStatus
from app.models.monitoring import Monitoring
from app.models.prediction import Prediction, PredictionStatus
from app.models.prediction_detail import PredictionDetail
from app.models.notification import Notification, NotificationStatus
from app.models.system_error import SystemError, DeviceStatus

__all__ = [
    "User",
    "UserRole",
    "UserStatus",
    "UserNotifStatus",
    "Monitoring",
    "Prediction",
    "PredictionStatus",
    "PredictionDetail",
    "Notification",
    "NotificationStatus",
    "SystemError",
    "DeviceStatus"
]
