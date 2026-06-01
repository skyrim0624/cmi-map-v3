import type { CmiEvent } from '../../data/cmi-events.ts';

export type EventListRegistrationButtonTone = 'active' | 'busy' | 'registered' | 'closed';
export type EventListRegistrationClosedReason = 'disabled' | 'closed' | 'full' | 'ended' | null;

export interface EventListRegistrationButtonState {
  label: string;
  ariaLabel: string;
  tone: EventListRegistrationButtonTone;
  disabled: boolean;
}

export const isCapacityFullRegistrationError = (message: string) => {
  const normalizedMessage = message.trim().toLowerCase();
  return (
    normalizedMessage.includes('活动名额已满') ||
    normalizedMessage.includes('名额已满') ||
    normalizedMessage.includes('capacity') ||
    normalizedMessage.includes('full')
  );
};

export const isEventRegistrationPastCutoff = (
  event: CmiEvent,
  referenceDate: Date = new Date()
) => {
  if (!event.startAt) return false;

  const startTime = new Date(event.startAt).getTime();
  return Number.isFinite(startTime) && startTime <= referenceDate.getTime();
};

export const getEventRegistrationClosedReason = (
  event: CmiEvent,
  {
    isMarkedFull = false,
    referenceDate = new Date(),
  }: {
    isMarkedFull?: boolean;
    referenceDate?: Date;
  } = {}
): EventListRegistrationClosedReason => {
  if (isEventRegistrationPastCutoff(event, referenceDate)) return 'ended';
  if (!event.registrationEnabled) return 'disabled';
  if (isMarkedFull) return 'full';
  if (event.registrationStatus === 'closed') return 'closed';
  return null;
};

export const isEventListRegistrationClosed = (
  event: CmiEvent,
  isMarkedFull = false,
  referenceDate: Date = new Date()
) => getEventRegistrationClosedReason(event, { isMarkedFull, referenceDate }) !== null;

export const getEventListRegistrationButtonState = ({
  event,
  hasRegistered = false,
  isRegistering = false,
  isMarkedFull = false,
  referenceDate = new Date(),
}: {
  event: CmiEvent;
  hasRegistered?: boolean;
  isRegistering?: boolean;
  isMarkedFull?: boolean;
  referenceDate?: Date;
}): EventListRegistrationButtonState => {
  if (isRegistering) {
    return {
      label: '报名中',
      ariaLabel: '正在报名活动',
      tone: 'busy',
      disabled: true,
    };
  }

  if (hasRegistered) {
    return {
      label: '已报名',
      ariaLabel: '已报名活动',
      tone: 'registered',
      disabled: true,
    };
  }

  const closedReason = getEventRegistrationClosedReason(event, { isMarkedFull, referenceDate });

  if (closedReason) {
    const closedLabelByReason: Record<Exclude<EventListRegistrationClosedReason, null>, string> = {
      disabled: '待开放',
      closed: '已关闭',
      full: '已满',
      ended: '已结束',
    };
    const closedAriaLabelByReason: Record<Exclude<EventListRegistrationClosedReason, null>, string> = {
      disabled: '活动暂不支持一键报名',
      closed: '活动报名已关闭',
      full: '活动名额已满',
      ended: '活动已经开始或结束',
    };

    return {
      label: closedLabelByReason[closedReason],
      ariaLabel: closedAriaLabelByReason[closedReason],
      tone: 'closed',
      disabled: true,
    };
  }

  return {
    label: '报名',
    ariaLabel: '报名活动',
    tone: 'active',
    disabled: false,
  };
};
