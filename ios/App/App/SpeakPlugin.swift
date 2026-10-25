import AVFoundation
import Capacitor

/// Speaks the directions of a trip (Beta, build 25, piece 5) with the iPhone's
/// own voice. The web view's speech is muted by silent mode and can drop a line
/// started straight after another (seen on the owner's iPhone 16, 25 October
/// 2026); navigation apps speak through the phone instead, as spoken prompts
/// that play in silent mode and turn music down while they last.
///
/// Nigerian English when the phone has it, otherwise British English. Only the
/// newest line is said: one still being read is cut off. The Android version is
/// SpeakPlugin.java; both answer src/lib/speech.ts.
@objc(SpeakPlugin)
public class SpeakPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "SpeakPlugin"
    public let jsName = "Speak"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "volume", returnType: CAPPluginReturnPromise)
    ]

    private let synthesizer = AVSpeechSynthesizer()

    /// Written to the app's output, which `devicectl ... launch --console` shows on a Mac
    private func log(_ message: String) {
        print("[WakaGuard speech] \(message)")
    }

    override public func load() {
        synthesizer.delegate = self
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.trimmingCharacters(in: .whitespaces).isEmpty else {
            call.reject("Nothing to say")
            return
        }
        DispatchQueue.main.async {
            self.takeAudio()
            if self.synthesizer.isSpeaking {
                self.synthesizer.stopSpeaking(at: .immediate)
            }
            let line = AVSpeechUtterance(string: text)
            line.voice = AVSpeechSynthesisVoice(language: "en-NG") ?? AVSpeechSynthesisVoice(language: "en-GB")
            let session = AVAudioSession.sharedInstance()
            self.log("speak at volume \(session.outputVolume), voice \(line.voice?.language ?? "none")")
            self.synthesizer.speak(line)
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.log("stop")
            self.synthesizer.stopSpeaking(at: .immediate)
            self.giveBackAudio()
            call.resolve()
        }
    }

    /// The volume the spoken lines play at, 0 to 100.
    ///
    /// iOS only updates an app's reading of the volume while its sound is on,
    /// and the sound is given back between lines, so a volume turned down after
    /// the last line still read as before (the owner's iPhone 16, 25 October
    /// 2026). Between lines the sound is switched on just long enough to read
    /// it, mixed with other audio, so music is neither stopped nor turned down.
    @objc func volume(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let session = AVAudioSession.sharedInstance()
            if self.synthesizer.isSpeaking {
                call.resolve(["level": Int((session.outputVolume * 100).rounded()), "max": 100])
                return
            }
            try? session.setCategory(.playback, mode: .voicePrompt, options: [.mixWithOthers])
            try? session.setActive(true)
            let level = Int((session.outputVolume * 100).rounded())
            try? session.setActive(false, options: .notifyOthersOnDeactivation)
            call.resolve(["level": level, "max": 100])
        }
    }

    /// Spoken prompts: heard in silent mode, with other sound turned down meanwhile
    private func takeAudio() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .voicePrompt, options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
        } catch {
            log("sound setting refused: \(error)")
        }
        do {
            try session.setActive(true)
        } catch {
            log("sound could not start: \(error)")
        }
    }

    /// Lets music come back up once nothing more is being said
    private func giveBackAudio() {
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func finished() {
        // A line cut off by the next one also lands here: wait a moment, and only
        // give the sound back if nothing has started since
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            if !self.synthesizer.isSpeaking {
                self.giveBackAudio()
            }
        }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        log("started")
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        log("finished")
        finished()
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        log("cut off")
        finished()
    }
}
