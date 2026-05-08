import { toast } from 'sonner';

export const notify = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  info: (msg) => toast.message(msg),
  promise: (p, msgs) => toast.promise(p, msgs),
};
