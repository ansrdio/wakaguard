package com.wakaguard.app;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * SOS from the lock screen (build 27). In an ambush "there will be no time for
 * me to pick up my phone" (a regular tester, 29 October 2026). Android lets no
 * app use the power button, so the next best thing is a button on the
 * notification that is already on the lock screen for the whole trip.
 *
 * The background location plugin shows "Safe Trip active" while a trip runs
 * and cannot carry buttons. Once its watcher has started, arm() shows the same
 * notification again under the plugin's own id, now with "SOS". When the trip
 * ends the plugin takes its notification away, and with it this one.
 *
 * "SOS" opens SosConfirmActivity over the lock screen, which asks once more so
 * a pocket cannot send it, then posts the SOS to the server with the trip's
 * own key, as the backup route does. The trip details stay in the app's
 * private storage, which is never backed up, and are cleared by disarm().
 */
@CapacitorPlugin(name = "TripSos")
public class TripSosPlugin extends Plugin {
    /** The background location plugin's notification id and channel (BackgroundGeolocationService.java) */
    static final int PLUGIN_NOTIFICATION_ID = 28351;
    static final String PLUGIN_CHANNEL_ID = "com.equimaps.capacitor_background_geolocation";
    static final String PREFS = "wakaguard_trip_sos";

    @PluginMethod
    public void arm(PluginCall call) {
        String uid = call.getString("uid");
        String tripId = call.getString("tripId");
        String key = call.getString("key");
        String endpoint = call.getString("endpoint");
        if (uid == null || tripId == null || key == null || endpoint == null || !endpoint.startsWith("https://")) {
            call.reject("Missing trip details");
            return;
        }
        Context context = getContext();
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("uid", uid)
            .putString("tripId", tripId)
            .putString("key", key)
            .putString("endpoint", endpoint)
            .putBoolean("isTest", Boolean.TRUE.equals(call.getBoolean("isTest", false)))
            .apply();
        try {
            NotificationManagerCompat.from(context).notify(PLUGIN_NOTIFICATION_ID, tripNotification(
                context,
                call.getString("title", "Safe Trip active"),
                call.getString("message", "Sharing your location with your trusted contacts.")
            ));
        } catch (SecurityException notAllowed) {
            // Notifications switched off: the trip runs on without the button
        }
        call.resolve(new JSObject().put("armed", true));
    }

    @PluginMethod
    public void disarm(PluginCall call) {
        clear(getContext());
        call.resolve();
    }

    static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
    }

    /** The plugin's notification as it draws it, plus "SOS", and shown in full on the lock screen */
    private static Notification tripNotification(Context context, String title, String message) {
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) open.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        Intent sos = new Intent(context, SosConfirmActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, PLUGIN_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_wakaguard)
            .setColor(ContextCompat.getColor(context, R.color.notification_green))
            .setContentTitle(title)
            .setContentText(message)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setWhen(System.currentTimeMillis())
            .addAction(0, "SOS", PendingIntent.getActivity(context, 7300, sos, flags));
        if (open != null) builder.setContentIntent(PendingIntent.getActivity(context, 7301, open, flags));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }
        return builder.build();
    }

    /** The armed trip, or null */
    static SharedPreferences armed(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return prefs.getString("tripId", null) == null ? null : prefs;
    }
}
