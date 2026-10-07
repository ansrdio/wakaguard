package com.wakaguard.app;

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
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    // Shown behind the status and navigation bars. Matches backgroundColor in capacitor.config.ts.
    private static final int BARS_BACKGROUND = Color.parseColor("#1e293b");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        super.onCreate(savedInstanceState);
        keepWebViewClearOfSystemBars();
        goBackInsideTheAppFirst();
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
