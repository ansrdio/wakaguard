package com.wakaguard.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Draws the trip reminders ("5 minutes left", "Are you okay?", "Your contacts
 * will be texted in 5 minutes") with three buttons: "I've arrived", "+15 min"
 * and "More time…", which opens the Trip screen's picker for any amount.
 *
 * Firebase's own notifications cannot carry buttons, so for this build and
 * later the server sends these reminders without a notification part, marked
 * wg_buttons = "trip" (functions/src/reminderPush.ts), and they are drawn
 * here. Everything else goes on to Capacitor's push plugin as before.
 *
 * A press opens WakaGuard with the button in wg_action. The extra
 * google.message_id makes Capacitor's push plugin pass the press to the app
 * (src/lib/tripNotificationActions.ts), which does what the same button on
 * the Trip screen does. Opening the app from the lock screen asks for the
 * phone's unlock first, so a pocket cannot end a trip.
 *
 * From build 24 they go on their own "Trip alerts" channel with WakaGuard's own
 * sound (res/raw/wakaguard_alert.wav), a long vibration and the alarm
 * category, which Do Not Disturb lets through on phones that allow alarms. On
 * 18 October 2026 the owner did not notice an "Are you okay?" on the old
 * channel. A new channel, because Android keeps a channel's first settings.
 */
public class TripReminderMessagingService extends MessagingService {
    /** Made here, when the app starts and before any reminder is shown */
    static final String CHANNEL_ID = "trip_alerts";
    /** Long enough to feel through a bag: buzz, pause, buzz, pause, buzz */
    static final long[] VIBRATION = {0, 700, 250, 700, 250, 700};
    /** One reminder per trip on screen: a newer one replaces the older */
    static final int NOTIFICATION_ID = 7100;
    static final String TAG_EXTRA = "wg_notification_tag";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        if (message.getNotification() == null && "trip".equals(data.get("wg_buttons"))) {
            showTripReminder(data);
        }
        // Capacitor still hears of every message, as it did before
        super.onMessageReceived(message);
    }

    private void showTripReminder(Map<String, String> data) {
        String tripId = data.get("id");
        if (tripId == null || tripId.isEmpty()) return;
        String tag = "wg_trip_" + tripId;
        String body = valueOr(data.get("wg_body"), "");

        makeChannel(this);
        NotificationCompat.Builder reminder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_wakaguard)
            .setColor(ContextCompat.getColor(this, R.color.notification_green))
            .setContentTitle(valueOr(data.get("wg_title"), "WakaGuard"))
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            // Phones before Android 8 have no channels: the sound and buzz are set here
            .setSound(alertSound(this))
            .setVibrate(VIBRATION)
            .setDefaults(NotificationCompat.DEFAULT_LIGHTS)
            .setAutoCancel(true)
            .setContentIntent(opening(data, tag, "tap", 0))
            .addAction(0, "I've arrived", opening(data, tag, "arrived", 1))
            .addAction(0, "+15 min", opening(data, tag, "add15", 2))
            .addAction(0, "More time…", opening(data, tag, "more", 3));

        try {
            NotificationManagerCompat.from(this).notify(tag, NOTIFICATION_ID, reminder.build());
        } catch (SecurityException notAllowed) {
            // Notifications switched off for the app: nothing can be shown
        }
    }

    /** Opens WakaGuard carrying the reminder and the button pressed */
    private PendingIntent opening(Map<String, String> data, String tag, String action, int button) {
        Intent intent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        for (Map.Entry<String, String> entry : data.entrySet()) intent.putExtra(entry.getKey(), entry.getValue());
        intent.putExtra("wg_action", action);
        intent.putExtra(TAG_EXTRA, tag);
        intent.putExtra("google.message_id", "wg-" + action + "-" + System.currentTimeMillis());
        // One code per notification and button (the tap and three buttons)
        int requestCode = tag.hashCode() * 4 + button;
        return PendingIntent.getActivity(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** The same channel the app makes, in case a reminder arrives before the app has made it */
    static void makeChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        makeWeatherChannel(manager);
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Trip alerts", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Asks if you are okay when a trip passes its arrival time, before your contacts are alerted");
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION);
        channel.setSound(alertSound(context), new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build());
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }

    /** The morning weather (functions/src/morningWeather.ts): an ordinary notification, nothing like a trip alert */
    static final String WEATHER_CHANNEL_ID = "weather";

    private static void makeWeatherChannel(NotificationManager manager) {
        if (manager.getNotificationChannel(WEATHER_CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(WEATHER_CHANNEL_ID, "Morning weather", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Rain, storms, fog or great heat expected where you are today");
        manager.createNotificationChannel(channel);
    }

    static Uri alertSound(Context context) {
        return Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.wakaguard_alert);
    }

    /** Takes a pressed reminder off the screen once the app has it */
    static void dismissPressedReminder(Context context, Intent intent) {
        if (intent == null) return;
        String tag = intent.getStringExtra(TAG_EXTRA);
        if (tag != null) NotificationManagerCompat.from(context).cancel(tag, NOTIFICATION_ID);
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }
}
