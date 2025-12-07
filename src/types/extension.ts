export interface Extension {
  extension: string;
  name: string;
  email?: string;
  department?: string;
  voicemail?: string;
  callwaiting?: string;
  outboundcid?: string;
  sipname?: string;
}

export type ExtensionStatus = 'online' | 'offline' | 'busy' | 'away';

export interface ExtensionWithStatus extends Extension {
  status: ExtensionStatus;
}
