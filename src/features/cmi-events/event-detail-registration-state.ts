import type { CmiEvent } from '../../data/cmi-events.ts';

export type EventDetailRegistrationButtonTone =
  | 'active'
  | 'busy'
  | 'registered'
  | 'closed'
  | 'external';

export type EventDetailRegistrationAction = 'internal' | 'external' | 'none';

export interface EventDetailRegistrationButtonState {
  label: string;
  ariaLabel: string;
  tone: EventDetailRegistrationButtonTone;
  disabled: boolean;
  action: EventDetailRegistrationAction;
}

export const getEventDetailRegistrationButtonState = ({
  event,
  hasRegistered = false,
  isSubmitting = false,
  isFull = false,
}: {
  event: CmiEvent;
  hasRegistered?: boolean;
  isSubmitting?: boolean;
  isFull?: boolean;
}): EventDetailRegistrationButtonState => {
  if (!event.registrationEnabled) {
    return {
      label: '报名',
      ariaLabel: '复制活动报名方式',
      tone: 'external',
      disabled: false,
      action: 'external',
    };
  }

  if (isSubmitting) {
    return {
      label: '报名中',
      ariaLabel: '正在报名活动',
      tone: 'busy',
      disabled: true,
      action: 'none',
    };
  }

  if (hasRegistered) {
    return {
      label: '已报名',
      ariaLabel: '已报名活动',
      tone: 'registered',
      disabled: true,
      action: 'none',
    };
  }

  if (isFull) {
    return {
      label: '已满',
      ariaLabel: '活动名额已满',
      tone: 'closed',
      disabled: true,
      action: 'none',
    };
  }

  if (event.registrationStatus === 'closed') {
    return {
      label: '已关闭',
      ariaLabel: '活动报名已关闭',
      tone: 'closed',
      disabled: true,
      action: 'none',
    };
  }

  return {
    label: '报名',
    ariaLabel: '报名活动',
    tone: 'active',
    disabled: false,
    action: 'internal',
  };
};
