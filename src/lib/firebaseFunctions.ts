import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { app, EMULATOR_HOST, usingEmulators } from './firebase';

/** The app's Cloud Functions; the local emulator's during a local run. */
export const functions = getFunctions(app);
if (usingEmulators()) {
  connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
}
