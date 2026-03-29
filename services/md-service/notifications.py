"""
Notification channels - Multi-channel alerts
Adapted from MD-Suite biodockify_ai/channels/
Supports: Telegram, Discord, Email, Slack
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional, List

logger = logging.getLogger("md-notifications")


class NotificationManager:
    """
    Manages multi-channel notifications for MD simulation events.
    Events: started, progress, completed, error, critical_system
    """

    def __init__(self):
        self.channels: Dict[str, Any] = {}
        self._load_config()

    def _load_config(self):
        """Load notification settings from environment"""
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
        self.discord_webhook = os.getenv("DISCORD_WEBHOOK_URL", "")
        self.slack_webhook = os.getenv("SLACK_WEBHOOK_URL", "")
        self.email_from = os.getenv("EMAIL_FROM", "")
        self.email_to = os.getenv("EMAIL_TO", "")
        self.email_smtp = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
        self.email_smtp_port = int(os.getenv("EMAIL_SMTP_PORT", "587"))

    def send(
        self, event: str, title: str, message: str, details: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send notification to all configured channels.

        Args:
            event: Event type (started, progress, completed, error, critical)
            title: Notification title
            message: Notification body
            details: Optional additional details

        Returns:
            Dict with results per channel
        """
        results = {}
        context = {
            "event": event,
            "title": title,
            "message": message,
            "details": details or {},
        }

        if self.telegram_token and self.telegram_chat_id:
            results["telegram"] = self._send_telegram(title, message)

        if self.discord_webhook:
            results["discord"] = self._send_discord(title, message, event)

        if self.slack_webhook:
            results["slack"] = self._send_slack(title, message, event)

        if self.email_from and self.email_to:
            results["email"] = self._send_email(title, message, event)

        return {"sent_to": list(results.keys()), "results": results}

    def _send_telegram(self, title: str, message: str) -> Dict[str, Any]:
        """Send Telegram message"""
        try:
            import httpx

            text = f"*{title}*\n{message}"
            response = httpx.post(
                f"https://api.telegram.org/bot{self.telegram_token}/sendMessage",
                json={
                    "chat_id": self.telegram_chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.warning(f"Telegram send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_discord(self, title: str, message: str, event: str) -> Dict[str, Any]:
        """Send Discord webhook message"""
        try:
            import httpx

            color_map = {
                "started": 3447003,
                "progress": 16776960,
                "completed": 3066993,
                "error": 15158332,
                "critical": 10038562,
            }
            color = color_map.get(event, 3447003)

            payload = {
                "embeds": [
                    {
                        "title": title,
                        "description": message,
                        "color": color,
                    }
                ]
            }
            response = httpx.post(self.discord_webhook, json=payload, timeout=10.0)
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.warning(f"Discord send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_slack(self, title: str, message: str, event: str) -> Dict[str, Any]:
        """Send Slack webhook message"""
        try:
            import httpx

            emoji_map = {
                "started": ":play_button:",
                "progress": ":hourglass:",
                "completed": ":white_check_mark:",
                "error": ":x:",
                "critical": ":rotating_light:",
            }
            emoji = emoji_map.get(event, ":bell:")

            payload = {"text": f"{emoji} *{title}*", "attachments": [{"text": message}]}
            response = httpx.post(self.slack_webhook, json=payload, timeout=10.0)
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.warning(f"Slack send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_email(self, title: str, message: str, event: str) -> Dict[str, Any]:
        """Send email notification"""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[Docking Studio MD] {title}"
            msg["From"] = self.email_from
            msg["To"] = self.email_to

            html = f"""
            <html><body>
            <h2>{title}</h2>
            <p>{message}</p>
            <hr/>
            <p><small>Sent by Docking Studio MD-Suite</small></p>
            </body></html>
            """
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP(self.email_smtp, self.email_smtp_port) as server:
                server.starttls()
                server.send_message(msg)
            return {"success": True}
        except Exception as e:
            logger.warning(f"Email send failed: {e}")
            return {"success": False, "error": str(e)}

    def notify_simulation_started(self, job_id: str, sim_time_ns: float) -> Dict:
        return self.send(
            "started",
            "MD Simulation Started",
            f"Job `{job_id}` is running.\nSimulation time: {sim_time_ns} ns",
        )

    def notify_simulation_progress(
        self, job_id: str, progress: int, message: str
    ) -> Dict:
        return self.send(
            "progress",
            f"MD Progress: {progress}%",
            f"Job `{job_id}`: {message}",
        )

    def notify_simulation_completed(self, job_id: str, results: Dict) -> Dict:
        return self.send(
            "completed",
            "MD Simulation Completed",
            f"Job `{job_id}` finished successfully.\nResults: {results}",
        )

    def notify_simulation_error(self, job_id: str, error: str) -> Dict:
        return self.send(
            "error",
            "MD Simulation Error",
            f"Job `{job_id}` encountered an error:\n{error}",
        )

    def notify_critical(self, title: str, message: str) -> Dict:
        return self.send(
            "critical",
            f"CRITICAL: {title}",
            message,
        )
