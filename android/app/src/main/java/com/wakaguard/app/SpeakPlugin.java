package com.wakaguard.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

/**
 * Speaks the directions of a trip (Beta, build 25, piece 5). Android's WebView
 * has a speechSynthesis that says nothing, so the page asks this plugin, which
 * uses the phone's own text-to-speech. Music or the radio is turned down while
 * a line is said, as in other navigation apps.
 *
 * Nigerian English when the phone has it, otherwise British English. Only the
 * newest line is said: one still being read is cut off.
 *
 * Used from src/lib/speech.ts.
 */
@CapacitorPlugin(name = "Speak")
public class SpeakPlugin extends Plugin {

    private static final String LINE_ID = "wakaguard-directions";

    private TextToSpeech tts;
    private boolean ready = false;
    /** A line asked for before the phone's speech engine was ready */
    private String waiting;
    private AudioManager audio;
    private AudioFocusRequest focus;

    private final AudioAttributes attributes = new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build();

    @Override
    public void load() {
        audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        tts = new TextToSpeech(getContext(), status -> {
            if (status != TextToSpeech.SUCCESS) return;
            Locale nigeria = new Locale("en", "NG");
            tts.setLanguage(tts.isLanguageAvailable(nigeria) >= TextToSpeech.LANG_AVAILABLE ? nigeria : Locale.UK);
            tts.setAudioAttributes(attributes);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {}

                @Override
                public void onDone(String utteranceId) {
                    giveBackAudio();
                }

                @Override
                @SuppressWarnings("deprecation")
                public void onError(String utteranceId) {
                    giveBackAudio();
                }
            });
            ready = true;
            if (waiting != null) {
                say(waiting);
                waiting = null;
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Nothing to say");
            return;
        }
        if (ready) {
            say(text);
        } else {
            waiting = text;
        }
        call.resolve();
    }

    /**
     * The media volume, which the spoken lines play at. Volume buttons pressed
     * with nothing playing change the ringer instead, so it is easily left at 0
     * (the owner's Galaxy, 24 October 2026: the directions spoke, silently).
     */
    @PluginMethod
    public void volume(PluginCall call) {
        if (audio == null) {
            call.reject("No audio service");
            return;
        }
        JSObject result = new JSObject();
        result.put("level", audio.getStreamVolume(AudioManager.STREAM_MUSIC));
        result.put("max", audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC));
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        waiting = null;
        if (tts != null) tts.stop();
        giveBackAudio();
        call.resolve();
    }

    private void say(String text) {
        takeAudio();
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, LINE_ID);
    }

    /** Turns other sound down while a line is said */
    private void takeAudio() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attributes)
                .build();
            audio.requestAudioFocus(focus);
        } else {
            audio.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
        }
    }

    private void giveBackAudio() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focus != null) audio.abandonAudioFocusRequest(focus);
            focus = null;
        } else {
            audio.abandonAudioFocus(null);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        giveBackAudio();
    }
}
