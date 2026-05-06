import type { Server as IOServer } from 'socket.io';

declare global {
  // Attached in custom server so API routes can notify sockets when rooms are destroyed in Mongo.
  // eslint-disable-next-line no-var -- global augmentation requires `var` in TS
  var io: IOServer | undefined;
}

export {};
