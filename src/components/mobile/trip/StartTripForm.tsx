'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Navigation, Plus, UserPlus } from 'lucide-react';
import {
  ALERT_GRACE_MINUTES,
  ARRIVAL_PRESETS,
  DEFAULT_TRIP_MINUTES,
  MAX_ALERT_NAME_LENGTH,
  MAX_DESTINATION_LENGTH,
  MAX_TRIP_MINUTES,
  MAX_TRUSTED_CONTACTS,
  TripPlanErrors,
  formatClock,
  formatDuration,
  initialsOf,
  textContactsByDefault,
  validateTripPlan,
} from '@/lib/tripPlanning';
import { canBeTexted } from '@/lib/contactPhone';

export interface TripContact {
  id: string;
  name: string;
  /** Missing on a contact saved without a number the server can text */
  phoneE164?: string;
  phone?: string;
}

export interface StartTripRequest {
  destination: string;
  durationMinutes: number;
  contactIds: string[];
  alertName: string;
  /** Text the selected contacts the trip link as soon as the trip starts */
  textContacts: boolean;
}

interface StartTripFormProps {
  contacts: TripContact[];
  /** Name already saved for alerts, or a suggestion such as the sign-in name */
  alertName: string;
  /** True when alertName was saved by the user earlier, so it need not be asked again */
  alertNameSaved: boolean;
  processing: boolean;
  onStart: (request: StartTripRequest) => void;

  // Adding a contact reuses the screen's existing contact handlers and fields,
  // so a contact picked from the phone book lands in this form
  newContactName: string;
  newContactPhone: string;
  onNewContactNameChange: (value: string) => void;
  onNewContactPhoneChange: (value: string) => void;
  onAddContact: () => void;
  onPickFromPhone: () => void;
  onManageContacts: () => void;
}

const CUSTOM_HOURS = Array.from({ length: MAX_TRIP_MINUTES / 60 + 1 }, (_, h) => h);
const CUSTOM_MINUTES = [0, 15, 30, 45];

const inputClass =
  'w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 ' +
  'text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
const labelClass = 'block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2';
const errorClass = 'text-sm text-red-600 dark:text-red-400 mt-1.5';

/**
 * The start of a Safe Trip: where, by when, and who is told if you don't arrive.
 */
export function StartTripForm({
  contacts,
  alertName,
  alertNameSaved,
  processing,
  onStart,
  newContactName,
  newContactPhone,
  onNewContactNameChange,
  onNewContactPhoneChange,
  onAddContact,
  onPickFromPhone,
  onManageContacts,
}: StartTripFormProps) {
  const [destination, setDestination] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(DEFAULT_TRIP_MINUTES);
  const [customOpen, setCustomOpen] = useState(false);
  // Contacts are selected unless switched off, so one added a moment ago is included
  const [deselectedIds, setDeselectedIds] = useState<string[]>([]);
  const [name, setName] = useState(alertName);
  const [nameEdited, setNameEdited] = useState(false);
  const [editingName, setEditingName] = useState(false);
  // null until the traveller ticks or unticks the box; until then it follows the trip length
  const [textContactsChoice, setTextContactsChoice] = useState<boolean | null>(null);
  // Remembers how many contacts there were when "add another" was tapped, so
  // the small form closes by itself once the new contact has been saved
  const [addOpenAtCount, setAddOpenAtCount] = useState<number | null>(null);
  // Problems are shown once the user has tried to start, then kept up to date as they fix them
  const [submitted, setSubmitted] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Keep the "arrive by" time honest while the form is open
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // The saved name arrives after the first render
  const shownName = nameEdited ? name : alertName;

  // A contact whose number cannot be texted is never one of the people told
  const selectedIds = contacts
    .filter((c) => canBeTexted(c) && !deselectedIds.includes(c.id))
    .map((c) => c.id);
  const isPreset = ARRIVAL_PRESETS.some((p) => p.minutes === durationMinutes);
  const showCustom = customOpen || !isPreset;
  const showAddForm = contacts.length === 0 || addOpenAtCount === contacts.length
    || !!newContactName || !!newContactPhone;
  const canAddMore = contacts.length < MAX_TRUSTED_CONTACTS;
  const askForName = !alertNameSaved || editingName;

  const arriveByMs = nowMs + durationMinutes * 60 * 1000;
  const textContacts = textContactsChoice ?? textContactsByDefault(durationMinutes);

  const plan = {
    destination: destination.trim(),
    durationMinutes,
    contactIds: selectedIds,
    alertName: shownName.trim(),
  };
  const errors: TripPlanErrors = submitted ? validateTripPlan(plan) : {};

  const toggleContact = (id: string) => {
    setDeselectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(validateTripPlan(plan)).length > 0) return;
    onStart({ ...plan, textContacts });
  };

  return (
    <section
      aria-labelledby="start-trip-heading"
      className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-5"
    >
      <div>
        <h1 id="start-trip-heading" className="text-xl font-bold text-slate-900 dark:text-white">
          Start a safe trip
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          If you don&apos;t arrive, the people you choose get a text with your last location.
        </p>
      </div>

      {/* Where */}
      <div>
        <label htmlFor="trip-destination" className={labelClass}>Where are you going?</label>
        <input
          id="trip-destination"
          type="text"
          value={destination}
          maxLength={MAX_DESTINATION_LENGTH}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Benin City"
          autoComplete="off"
          aria-invalid={!!errors.destination}
          className={inputClass}
        />
        {errors.destination && <p role="alert" className={errorClass}>{errors.destination}</p>}
      </div>

      {/* When */}
      <div>
        <p className={labelClass} id="trip-duration-label">How long will it take?</p>
        <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="trip-duration-label">
          {ARRIVAL_PRESETS.map((preset) => {
            const selected = !showCustom && durationMinutes === preset.minutes;
            return (
              <button
                key={preset.minutes}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setDurationMinutes(preset.minutes);
                  setCustomOpen(false);
                }}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={showCustom}
            onClick={() => setCustomOpen(true)}
            className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-colors ${
              showCustom
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Other
          </button>
        </div>

        {showCustom && (
          <div className="flex items-center gap-2 mt-3">
            <label className="sr-only" htmlFor="trip-hours">Hours</label>
            <select
              id="trip-hours"
              value={Math.floor(durationMinutes / 60)}
              onChange={(e) => setDurationMinutes(Number(e.target.value) * 60 + (durationMinutes % 60))}
              className={`${inputClass} py-2.5`}
            >
              {CUSTOM_HOURS.map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
            <label className="sr-only" htmlFor="trip-minutes">Minutes</label>
            <select
              id="trip-minutes"
              value={durationMinutes % 60}
              onChange={(e) => setDurationMinutes(Math.floor(durationMinutes / 60) * 60 + Number(e.target.value))}
              className={`${inputClass} py-2.5`}
            >
              {CUSTOM_MINUTES.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        )}

        {errors.duration ? (
          <p role="alert" className={errorClass}>{errors.duration}</p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            Arrive by <span className="font-semibold text-slate-900 dark:text-white">{formatClock(arriveByMs, nowMs)}</span>
            {' '}({formatDuration(durationMinutes)}). If the trip is still running {ALERT_GRACE_MINUTES} minutes after
            that, your contacts are texted, even if your phone is off.
          </p>
        )}
      </div>

      {/* Who */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" id="trip-contacts-label">
            Who should be told?
          </p>
          {contacts.length > 0 && (
            <button
              type="button"
              onClick={onManageContacts}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </button>
          )}
        </div>

        {contacts.length > 0 && (
          <ul className="space-y-2" aria-labelledby="trip-contacts-label">
            {contacts.map((contact) => {
              if (!canBeTexted(contact)) {
                return (
                  <li
                    key={contact.id}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
                  >
                    <span
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 flex items-center justify-center flex-shrink-0"
                    >
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900 dark:text-white truncate">{contact.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{contact.phone || 'No number saved'}</span>
                      <span className="block text-sm text-amber-800 dark:text-amber-200 mt-1">
                        This number cannot be texted, so {contact.name} will not be told.{' '}
                        <button type="button" onClick={onManageContacts} className="font-semibold underline">
                          Fix it
                        </button>
                      </span>
                    </span>
                  </li>
                );
              }
              const checked = selectedIds.includes(contact.id);
              return (
                <li key={contact.id}>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${
                      checked
                        ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/40 dark:border-brand-700'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleContact(contact.id)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100 flex items-center justify-center text-sm font-bold flex-shrink-0"
                    >
                      {initialsOf(contact.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900 dark:text-white truncate">{contact.name}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{contact.phoneE164 || contact.phone}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        checked ? 'bg-brand-600 border-brand-600' : 'border-slate-300 dark:border-slate-500'
                      }`}
                    >
                      {checked && <Check className="w-4 h-4 text-white" />}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {showAddForm && canAddMore && (
          <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            {contacts.length === 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Add someone who would notice if you didn&apos;t arrive.
              </p>
            )}
            <label className="sr-only" htmlFor="trip-contact-name">Contact name</label>
            <input
              id="trip-contact-name"
              type="text"
              value={newContactName}
              onChange={(e) => onNewContactNameChange(e.target.value)}
              placeholder="Name"
              autoComplete="off"
              className={`${inputClass} py-2.5 text-sm`}
            />
            <label className="sr-only" htmlFor="trip-contact-phone">Contact phone number</label>
            <input
              id="trip-contact-phone"
              type="tel"
              value={newContactPhone}
              onChange={(e) => onNewContactPhoneChange(e.target.value)}
              placeholder="0803 123 4567"
              autoComplete="off"
              className={`${inputClass} py-2.5 text-sm`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAddContact}
                disabled={processing}
                className="flex-1 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add contact
              </button>
              <button
                type="button"
                onClick={onPickFromPhone}
                disabled={processing}
                className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                From phone
              </button>
            </div>
          </div>
        )}

        {!showAddForm && canAddMore && (
          <button
            type="button"
            onClick={() => setAddOpenAtCount(contacts.length)}
            className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add another person
          </button>
        )}

        {errors.contacts && <p role="alert" className={errorClass}>{errors.contacts}</p>}

        {contacts.length > 0 && (
          <label className="flex items-center gap-3 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={textContacts}
              onChange={(e) => setTextContactsChoice(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">Text them the trip link when I start</span>
          </label>
        )}
      </div>

      {/* Name shown to contacts */}
      <div>
        {askForName ? (
          <>
            <label htmlFor="trip-alert-name" className={labelClass}>Your name, as they know you</label>
            <input
              id="trip-alert-name"
              type="text"
              value={shownName}
              maxLength={MAX_ALERT_NAME_LENGTH}
              onChange={(e) => {
                setName(e.target.value);
                setNameEdited(true);
              }}
              placeholder="Ada"
              autoComplete="name"
              aria-invalid={!!errors.alertName}
              className={inputClass}
            />
            {errors.alertName ? (
              <p role="alert" className={errorClass}>{errors.alertName}</p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Texts to your contacts start with this name, so they know who it is about.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your contacts will see you as{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{shownName}</span>.{' '}
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change
            </button>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={processing}
        className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
        Start safe trip
      </button>
    </section>
  );
}
