import React from 'react';
import { Redirect } from 'expo-router';

/** Web-preview safeguard: any unmatched path (e.g. /mobile/index.html) re-enters at the splash. */
export default function NotFound() {
  return <Redirect href="/" />;
}
