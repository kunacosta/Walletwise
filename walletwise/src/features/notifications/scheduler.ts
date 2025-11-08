import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications';
import type { Account } from '../../types/account';
import type { Bill } from '../../types/bill';
import { computeSpendableForAccount } from '../spendable/spendable';
import { useSettings } from '../../state/settings';
import { getCached, setCached } from '../../lib/cache';
import { nextOccurrenceOnOrAfter } from '../bills/useBills';

const CHANNEL_ID = 'walletwise-bills';
const OVERSPEND_CACHE_KEY = 'walletwise:v1:overspend:lastNotifiedDate';

const ensureChannel = async () => {
  if (Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Bills & Spendable',
        importance: 5,
        description: 'Bill reminders and safe-to-spend alerts',
        visibility: 1,
        lights: true,
        vibration: true,
      });
    } catch {
      // ignore
    }
  }
};

export const ensurePermission = async (): Promise<boolean> => {
  const status = await LocalNotifications.checkPermissions();
  if (status.display === 'granted') return true;
  const req = await LocalNotifications.requestPermissions();
  return req.display === 'granted';
};

const djb2 = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i);
  return Math.abs(hash >>> 0);
};

const withinQuiet = (d: Date, start: string | null, end: string | null): boolean => {
  if (!start || !end) return false;
  const [sh, sm] = start.split(':').map((x) => Number(x));
  const [eh, em] = end.split(':').map((x) => Number(x));
  const s = sh * 60 + (sm || 0);
  const e = eh * 60 + (em || 0);
  const t = d.getHours() * 60 + d.getMinutes();
  if (s === e) return false;
  return s < e ? (t >= s && t < e) : (t >= s || t < e);
};

const atTime = (date: Date, hours = 9, minutes = 0): Date => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  const { quietHoursStart, quietHoursEnd } = useSettings.getState();
  if (withinQuiet(d, quietHoursStart, quietHoursEnd)) {
    // move to quiet end
    const [eh, em] = (quietHoursEnd ?? '08:00').split(':').map((x) => Number(x));
    // if quiet end earlier than current time in day, schedule next day
    const target = new Date(d);
    target.setHours(eh || 8, em || 0, 0, 0);
    if (target.getTime() <= d.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }
  return d;
};

const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

const buildBillNotifs = (bill: Bill, now: Date): ScheduleOptions['notifications'] => {
  const list: NonNullable<ScheduleOptions['notifications']> = [];
  const next = nextOccurrenceOnOrAfter(bill, now);
  if (!next) return list;
  // 3 days before
  const threeDaysBefore = new Date(next);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  if (threeDaysBefore.getTime() > now.getTime()) {
    list.push({
      id: djb2(`bill:${bill.id}:${dateKey(next)}:pre`),
      title: `Upcoming bill: ${bill.name}`,
      body: `Due in 3 days - ${bill.amount.toFixed(2)}`,
      channelId: CHANNEL_ID,
      extra: { tag: 'walletwise' },
      schedule: { at: atTime(threeDaysBefore) },
    });
  }
  // Morning of due
  if (next.getTime() >= now.getTime()) {
    list.push({
      id: djb2(`bill:${bill.id}:${dateKey(next)}:due`),
      title: `Bill due today: ${bill.name}`,
      body: `Amount - ${bill.amount.toFixed(2)}`,
      channelId: CHANNEL_ID,
      extra: { tag: 'walletwise' },
      schedule: { at: atTime(next) },
    });
  }
  // Overdue (if not paid and due date passed)
  if (next.getTime() < now.getTime() && (bill.status === 'unpaid' || bill.status === 'scheduled')) {
    const tomorrowMorning = atTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    list.push({
      id: djb2(`bill:${bill.id}:${dateKey(next)}:overdue`),
      title: `Overdue bill: ${bill.name}`,
      body: `Was due ${dateKey(next)} - ${bill.amount.toFixed(2)}`,
      channelId: CHANNEL_ID,
      extra: { tag: 'walletwise' },
      schedule: { at: tomorrowMorning },
    });
  }
  return list;
};

const buildOverspendNotif = async (accounts: Account[], bills: Bill[], now: Date) => {
  const anyBelow = accounts.some((a) => computeSpendableForAccount(a, bills, { now }).safeToSpend < 0);
  if (!anyBelow) return null;
  const last = await getCached<string | null>(OVERSPEND_CACHE_KEY);
  const todayKey = dateKey(now);
  if (last === todayKey) return null;
  await setCached(OVERSPEND_CACHE_KEY, todayKey);
  return {
    id: djb2(`overspend:${todayKey}`),
    title: 'Caution: approaching buffer',
    body: 'Safe to spend is below your buffer. Review upcoming bills.',
    channelId: CHANNEL_ID,
    extra: { tag: 'walletwise' },
    schedule: { at: atTime(now, now.getHours(), now.getMinutes() + 1) },
  };
};

export const rescheduleAll = async (accounts: Account[], bills: Bill[]): Promise<void> => {
  await ensureChannel();
  const now = new Date();
  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications.filter((n: any) => n?.extra?.tag === 'walletwise');
  if (ours.length > 0) {
    await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  }

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 60);
  const notifications: NonNullable<ScheduleOptions['notifications']> = [];
  for (const b of bills) {
    const list = buildBillNotifs(b, now);
    for (const n of list) {
      const at = (n.schedule as any)?.at as Date | undefined;
      if (!at || at.getTime() <= horizon.getTime()) notifications.push(n);
    }
  }

  const overspend = await buildOverspendNotif(accounts, bills, now);
  if (overspend) notifications.push(overspend);

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
};
