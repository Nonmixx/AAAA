'use client';

import { ReceiverDetail } from '../../pages/donor/ReceiverDetail';

export function NeedDetailLegacy() {
  return <ReceiverDetail backHref="/needs" donateHref="/login" />;
}
