package com.wakaguard.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Shown behind the status and navigation bars. Matches backgroundColor in capacitor.config.ts.
    private static final int BARS_BACKGROUND = Color.parseColor("#10231D");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        forgetPressedReminderWhenRebuilt(savedInstanceState);
        // The app's own plugins have to be named before the bridge starts
        registerPlugin(ContactPickerPlugin.class);
        registerPlugin(KeepRunningPlugin.class);
        registerPlugin(SpeakPlugin.class);
        super.onCreate(savedInstanceState);
        // The trip alerts channel exists from the first launch, so it is in the
        // phone's settings and ready before any reminder arrives
        TripReminderMessagingService.makeChannel(this);
        keepWebViewClearOfSystemBars();
        goBackInsideTheAppFirst();
    }

    /**
     * A reminder's button may have been what started the app. When Android later
     * rebuilds the app from that same start (after closing it in the background,
     * or reopening it from recent apps) it would hand over the press again, and
     * "+15 min" would add time twice. Only the first start carries the press.
     */
    private void forgetPressedReminderWhenRebuilt(Bundle savedInstanceState) {
        Intent start = getIntent();
        if (start == null || !start.hasExtra("wg_action")) return;
        boolean rebuilt = savedInstanceState != null
            || (start.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0;
        if (rebuilt) setIntent(new Intent(start).replaceExtras(new Bundle()));
    }

    /**
     * A trip reminder's button opens the app here (also on a cold start, when
     * BridgeActivity passes the starting intent through). The app carries out
     * the press; the reminder itself is taken off the screen.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        TripReminderMessagingService.dismissPressedReminder(this, intent);
    }

    /**
     * Back returns to the previous page of the web app while there is one.
     * From the first screen it puts the app in the background rather than
     * closing it, so a trip in progress keeps running.
     */
    private void goBackInsideTheAppFirst() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }

    /**
     * From Android 15, apps are drawn behind the status and navigation bars
     * and the keyboard no longer resizes them. The web app is laid out for the
     * older behaviour, so keep the web view between the bars and above the
     * keyboard. Earlier versions already do this themselves.
     */
    private void keepWebViewClearOfSystemBars() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return;

        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(BARS_BACKGROUND);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
