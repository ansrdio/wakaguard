import Capacitor

/// The app's one screen: Capacitor's own, plus the plugins written for
/// WakaGuard itself, which Capacitor does not find by itself. Named in
/// Base.lproj/Main.storyboard. (Android registers the same plugin in
/// MainActivity.java.)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(ContactPickerPlugin())
    }
}
