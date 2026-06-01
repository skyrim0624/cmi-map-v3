import type { CmiEvent } from '../../data/cmi-events.ts';

export type EventListRegistrationButtonTone = 'active' | 'busy' | 'registered' | 'closed';

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

export const isEventListRegistrationClosed = (event: CmiEvent, isMarkedFull = false) =>
  isMarkedFull || Boolean(event.registrationEnabled && event.registrationStatus === 'closed');

export const getEventListRegistrationButtonState = ({
  event,
  hasRegistered = false,
  isRegistering = false,
  isMarkedFull = false,
}: {
  event: CmiEvent;
  hasRegistered?: boolean;
  isRegistering?: boolean;
  isMarkedFull?: boolean;
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

  if (isEventListRegistrationClosed(event, isMarkedFull)) {
    return {
      label: '已满',
      ariaLabel: '活动名额已满',
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
