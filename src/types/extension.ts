export interface Extension {
  extension: string;
  name: string;
  email?: string;
  department?: string;
  voicemail?: string;
  callwaiting?: string;
  outboundcid?: string;
  sipname?: string;
  tech?: string;
}

// Asterisk device states mapped to user-friendly names
export type ExtensionStatus = 
  | 'available'    // Idle - device is registered and available
  | 'incall'       // InUse - on a call
  | 'ringing'      // Ringing - currently ringing
  | 'busy'         // Busy - in use and cannot take more calls
  | 'dnd'          // Do Not Disturb
  | 'unavailable'  // Not registered / unreachable
  | 'hold'         // On hold
  | 'unknown';     // Unknown state

export interface ExtensionWithStatus extends Extension {
  status: ExtensionStatus;
  statusText?: string;
}
