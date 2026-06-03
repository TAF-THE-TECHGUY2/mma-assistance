import { FormEvent, ReactNode, useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  Check,
  Loader2,
  Mail,
  Monitor,
  Save,
  Settings as SettingsIcon,
  Shield,
  User as UserIcon,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { updateMe } from '../api/auth';
import { getSettings, updateSettings } from '../api/settings';
import type {
  NotificationEvent,
  NotificationSettings,
  Role,
  UserPreferences,
} from '../types';

const ROLE_LABELS: Record<Role, string> = {
  booking: 'Booking',
  operations: 'Operations',
  billing: 'Billing',
  admin: 'Admin',
  owner: 'Owner',
};

const defaultAppSettings: UserPreferences = {
  emailNotifications: true,
  desktopNotifications: false,
  compactTables: false,
};

export default function Settings() {
  const { user, setCurrentUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [appSettings, setAppSettings] =
    useState<UserPreferences>(defaultAppSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [appSaved, setAppSaved] = useState(false);
  const [appErr, setAppErr] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setAppSettings({
      ...defaultAppSettings,
      ...(user?.preferences ?? {}),
    });
  }, [user]);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || savingProfile) return;
    setSavingProfile(true);
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const updatedUser = await updateMe({
        name: name.trim(),
        email: email.trim(),
      });
      setCurrentUser(updatedUser);
      setProfileMsg('Profile updated successfully.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (err instanceof Error ? err.message : null) ??
        'Failed to update profile.';
      setProfileErr(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function toggleAppSetting(key: keyof UserPreferences) {
    if (!user || savingSettings) return;

    const previous = appSettings;
    const next = { ...previous, [key]: !previous[key] };

    setAppSettings(next);
    setSavingSettings(true);
    setAppErr(null);

    try {
      const updatedUser = await updateMe({ preferences: next });
      setCurrentUser(updatedUser);
      setAppSaved(true);
      window.setTimeout(() => setAppSaved(false), 1500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (err instanceof Error ? err.message : null) ??
        'Failed to save application settings.';
      setAppSettings(previous);
      setAppErr(message);
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <SettingsIcon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500">
            Manage your profile and application preferences.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile card */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <UserIcon className="h-4 w-4 text-teal-600" />
            <h2 className="text-base font-semibold text-slate-800">Profile</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-5 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-lg font-semibold text-teal-700">
                {(user?.name ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {user?.name ?? '—'}
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  <Shield className="h-3 w-3" />
                  {user ? ROLE_LABELS[user.role] : '—'}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {profileMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Check className="h-4 w-4" />
                {profileMsg}
              </div>
            )}
            {profileErr && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {profileErr}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile || !user}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Profile
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-teal-600" />
              <h2 className="text-base font-semibold text-slate-800">
                Application Settings
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
              {savingSettings ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving
                </>
              ) : appSaved ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-600">Saved</span>
                </>
              ) : (
                'Synced to your account'
              )}
            </span>
          </div>

          {appErr && (
            <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {appErr}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            <SettingToggle
              icon={<Bell className="h-4 w-4 text-slate-500" />}
              title="Email notifications"
              description="Receive case and billing updates by email."
              enabled={appSettings.emailNotifications}
              onToggle={() => toggleAppSetting('emailNotifications')}
              disabled={savingSettings || !user}
            />
            <SettingToggle
              icon={<Monitor className="h-4 w-4 text-slate-500" />}
              title="Desktop notifications"
              description="Show in-app alerts for assignments and reviews."
              enabled={appSettings.desktopNotifications}
              onToggle={() => toggleAppSetting('desktopNotifications')}
              disabled={savingSettings || !user}
            />
            <SettingToggle
              icon={<SettingsIcon className="h-4 w-4 text-slate-500" />}
              title="Compact tables"
              description="Use denser row spacing across data tables."
              enabled={appSettings.compactTables}
              onToggle={() => toggleAppSetting('compactTables')}
              disabled={savingSettings || !user}
            />
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400">
              These preferences follow your account instead of being limited to
              the current browser session.
            </p>
          </div>
        </section>
      </div>

      {(user?.role === 'owner' || user?.role === 'admin') && (
        <EmailNotificationsCard />
      )}
    </div>
  );
}

const DEPARTMENTS: { key: keyof NotificationSettings['department_emails']; label: string; hint: string }[] = [
  { key: 'operations', label: 'Operations', hint: 'Emailed when a case enters the Operations stage.' },
  { key: 'admin', label: 'Admin Review', hint: 'Emailed when a case is sent for admin review.' },
  { key: 'billing', label: 'Billing', hint: 'Emailed when a case moves to billing.' },
  { key: 'laboratory', label: 'Laboratory', hint: 'Emailed when a new laboratory request is logged.' },
];

const EVENT_LABELS: { key: NotificationEvent; label: string }[] = [
  { key: 'case_created', label: 'New case created' },
  { key: 'lab_request_created', label: 'New laboratory request' },
  { key: 'sent_to_operations', label: 'Case sent to operations' },
  { key: 'sent_to_admin_review', label: 'Case sent to admin review' },
  { key: 'sent_to_billing', label: 'Case sent to billing' },
  { key: 'case_closed', label: 'Case closed' },
  { key: 'document_uploaded', label: 'Document uploaded' },
];

function EmailNotificationsCard() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => {
        if (active) setSettings(s);
      })
      .catch((err: any) => {
        if (active)
          setError(
            err?.response?.data?.message ?? 'Failed to load notification settings.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!settings || saving) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setSavedMsg('Notification settings saved.');
      window.setTimeout(() => setSavedMsg(null), 2000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? 'Failed to save notification settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100';

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Mail className="h-4 w-4 text-teal-600" />
        <h2 className="text-base font-semibold text-slate-800">
          Email Notifications
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : !settings ? (
        <div className="px-5 py-6 text-sm text-red-600">
          {error ?? 'Unable to load settings.'}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 px-5 py-5">
          <p className="text-sm text-slate-500">
            Set who is emailed when cases move through the workflow. Each
            department is notified when a case enters its stage; the owner can
            receive every enabled event.
          </p>

          {/* Owner */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Shield className="h-4 w-4 text-teal-600" />
              Owner email
            </label>
            <input
              type="email"
              value={settings.owner_email}
              onChange={(e) =>
                setSettings({ ...settings, owner_email: e.target.value })
              }
              placeholder="owner@yourclinic.co.za"
              className={inputClass}
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={settings.owner_receives_all}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    owner_receives_all: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Owner receives every enabled event below
            </label>
          </div>

          {/* Departments */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-teal-600" />
              Department recipients
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {DEPARTMENTS.map((d) => (
                <div key={d.key}>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    {d.label}
                  </label>
                  <input
                    type="email"
                    value={settings.department_emails[d.key] ?? ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        department_emails: {
                          ...settings.department_emails,
                          [d.key]: e.target.value,
                        },
                      })
                    }
                    placeholder={`${d.key}@yourclinic.co.za`}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-400">{d.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Event toggles */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Bell className="h-4 w-4 text-teal-600" />
              Events that send email
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EVENT_LABELS.map((ev) => (
                <label
                  key={ev.key}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={settings.events[ev.key] ?? false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        events: { ...settings.events, [ev.key]: e.target.checked },
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>

          {savedMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" />
              {savedMsg}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Notification Settings
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

interface SettingToggleProps {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function SettingToggle({
  icon,
  title,
  description,
  enabled,
  onToggle,
  disabled = false,
}: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{icon}</span>
        <div>
          <p className="text-sm font-medium text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
          enabled ? 'bg-teal-600' : 'bg-slate-200'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-disabled={disabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
        />
      </button>
    </div>
  );
}
