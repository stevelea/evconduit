import logging
from app.storage.vehicle import save_vehicle_data_with_client
from app.storage.charging import save_charging_sample, check_and_create_charging_session

logger = logging.getLogger(__name__)

async def process_event(event: dict) -> tuple[int, bool]:
    """
    Processes an incoming webhook event and dispatches it to appropriate handlers.
    Returns (count, was_saved) where was_saved indicates if fresh data was saved (not stale).
    """
    event_type = event.get("event")
    logger.info(f"[🔔 WEBHOOK] Event: {event_type}")

    if event_type == "system:heartbeat":
        logger.info("💓 Heartbeat received")
        return (1, True)

    if event_type in ["user:vehicle:discovered", "user:vehicle:updated"]:
        vehicle = event.get("vehicle")
        user = event.get("user", {})
        user_id = user.get("id")
        event_id = event.get("id")  # Webhook event ID for tracking

        if vehicle and user_id:
            vehicle["userId"] = user_id
            vehicle_id = vehicle.get("id")

            # Log location data presence for debugging
            location = vehicle.get("location")
            if location:
                logger.info(f"[📍 Location data] Vehicle {vehicle_id}: lat={location.get('latitude')}, lon={location.get('longitude')}")
            else:
                logger.warning(f"[⚠️ No location] Vehicle {vehicle_id} has no location data in webhook event")

            # Save vehicle cache (returns False if skipped due to stale data)
            logger.info(f"[🚗 Saving vehicle] Vehicle ID: {vehicle_id} User ID: {user_id}")
            was_saved = await save_vehicle_data_with_client(vehicle)

            # Save charging sample for insights (only if data was fresh)
            if was_saved:
                charge_state = vehicle.get("chargeState", {})
                if charge_state:
                    logger.info(f"[🔋 Charging data] Vehicle {vehicle_id}: charging={charge_state.get('isCharging')}, battery={charge_state.get('batteryLevel')}%")
                    sample_id = await save_charging_sample(vehicle, user_id, event_id)
                    if sample_id:
                        # Check if a charging session should be created/finalized
                        await check_and_create_charging_session(vehicle_id, user_id)

            return (1, was_saved)
        else:
            logger.warning(f"[⚠️ Missing data] vehicle or user_id missing in event: {event}")
            return (0, False)

    logger.warning(f"[⚠️ Unhandled event] type: {event_type}")
    return (0, False)