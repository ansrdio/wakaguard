package com.wakaguard.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.content.ContextCompat;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import org.json.JSONObject;

/**
 * "Send SOS to your contacts?", opened by the SOS button on the "Safe Trip
 * active" notification (TripSosPlugin.java). It shows over the lock screen and
 * asks once, so a pocket cannot send it. "Send SOS" posts to the server's
 * tripAction with the trip's own key (functions/src/tripAction.ts), which saves
 * the same SOS alert the app's button saves: the contacts get the SOS text
 * with where the phone is. Nothing else is done: 112 is offered only if the
 * SOS could not be sent. Not exported: only the app's own notification opens it.
 */
public class SosConfirmActivity extends Activity {
    private static final int RED = Color.parseColor("#B91C1C");
    private static final int INK = Color.parseColor("#0F172A");
    private static final int GREY = Color.parseColor("#475569");
    /** A position older than this is left out, and the server uses the trip's latest */
    private static final long FRESH_MS = 5 * 60 * 1000;
    private static final int ATTEMPTS = 3;

    private TextView title;
    private TextView body;
    private Button send;
    private Button cancel;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final String requestId = newRequestId();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showOverLockScreen();
        buildScreen();

        SharedPreferences trip = TripSosPlugin.armed(this);
        if (trip == null) {
            say("No trip is running", "Start a trip in WakaGuard to use SOS from here.");
            send.setVisibility(Button.GONE);
            cancel.setText("Close");
            return;
        }
        if (trip.getBoolean("isTest", false)) {
            body.setText("This is a test trip, so the text says TEST. Your contacts get where you are now and a link to follow you.");
        }
        send.setOnClickListener((v) -> sendSos(trip));
    }

    private void showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
    }

    private void buildScreen() {
        LinearLayout column = new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_VERTICAL);
        column.setBackgroundColor(Color.WHITE);
        int pad = dp(24);
        column.setPadding(pad, pad, pad, pad);

        title = text("Send SOS to your contacts?", 26, INK, true);
        body = text("They get a text with where you are now and a link to follow you.", 17, GREY, false);
        send = button("Send SOS", Color.WHITE, RED);
        cancel = button("Cancel", INK, Color.parseColor("#F1F5F9"));
        cancel.setOnClickListener((v) -> finish());

        column.addView(title);
        column.addView(spacer(12));
        column.addView(body);
        column.addView(spacer(32));
        column.addView(send, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(64)));
        column.addView(spacer(12));
        column.addView(cancel, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56)));
        setContentView(column);
    }

    private void sendSos(SharedPreferences trip) {
        send.setEnabled(false);
        send.setText("Sending…");
        cancel.setEnabled(false);
        Location here = freshLocation();
        new Thread(() -> {
            int status = -1;
            for (int attempt = 1; attempt <= ATTEMPTS && status != 200 && status != 410 && status != 403; attempt++) {
                status = post(trip, here);
                if (status != 200 && attempt < ATTEMPTS) sleep(attempt * 3000L);
            }
            final int outcome = status;
            main.post(() -> showOutcome(outcome));
        }).start();
    }

    private void showOutcome(int status) {
        cancel.setEnabled(true);
        cancel.setText("Close");
        send.setEnabled(true);
        if (status == 200) {
            // Still armed: the trip runs on as an SOS, and another press sends again
            say("SOS sent", "Your contacts are being texted with where you are. Keep your phone on you if you can.");
            send.setVisibility(Button.GONE);
        } else if (status == 410) {
            say("Your trip has ended", "SOS from here works only during a trip. Call 112 if you need help now.");
            offer112();
        } else {
            say("SOS could not be sent", "Unlock your phone and press SOS in WakaGuard, or call 112.");
            offer112();
        }
    }

    private void offer112() {
        send.setText("Call 112");
        send.setOnClickListener((v) -> startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:112"))));
    }

    /** The server's answer, or -1 when it could not be reached */
    private int post(SharedPreferences trip, Location here) {
        HttpURLConnection connection = null;
        try {
            JSONObject json = new JSONObject()
                .put("uid", trip.getString("uid", ""))
                .put("tripId", trip.getString("tripId", ""))
                .put("key", trip.getString("key", ""))
                .put("action", "sos")
                .put("requestId", requestId);
            if (here != null) json.put("lat", here.getLatitude()).put("lng", here.getLongitude());
            connection = (HttpURLConnection) new URL(trip.getString("endpoint", "")).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            try (OutputStream out = connection.getOutputStream()) {
                out.write(json.toString().getBytes(StandardCharsets.UTF_8));
            }
            return connection.getResponseCode();
        } catch (Exception failed) {
            return -1;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    /** The phone's newest position from the last few minutes, or null */
    private Location freshLocation() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return null;
        }
        LocationManager manager = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (manager == null) return null;
        Location best = null;
        String[] providers = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            ? new String[] { LocationManager.FUSED_PROVIDER, LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }
            : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER };
        for (String provider : providers) {
            try {
                Location fix = manager.getLastKnownLocation(provider);
                if (fix != null && (best == null || fix.getTime() > best.getTime())) best = fix;
            } catch (SecurityException | IllegalArgumentException ignored) {
                // That provider is not there or not allowed
            }
        }
        return best != null && System.currentTimeMillis() - best.getTime() <= FRESH_MS ? best : null;
    }

    private void say(String heading, String words) {
        title.setText(heading);
        body.setText(words);
    }

    private TextView text(String words, int sp, int colour, boolean bold) {
        TextView view = new TextView(this);
        view.setText(words);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        view.setTextColor(colour);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    private Button button(String words, int textColour, int fill) {
        Button view = new Button(this);
        view.setText(words);
        view.setAllCaps(false);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 19);
        view.setTypeface(Typeface.DEFAULT_BOLD);
        view.setTextColor(textColour);
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(fill);
        shape.setCornerRadius(dp(18));
        view.setBackground(shape);
        return view;
    }

    private android.view.View spacer(int heightDp) {
        android.view.View view = new android.view.View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(1, dp(heightDp)));
        return view;
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private static String newRequestId() {
        byte[] bytes = new byte[12];
        new SecureRandom().nextBytes(bytes);
        StringBuilder hex = new StringBuilder("lock");
        for (byte b : bytes) hex.append(String.format("%02x", b));
        return hex.toString();
    }
}
