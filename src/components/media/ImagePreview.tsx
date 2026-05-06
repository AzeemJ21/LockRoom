'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export function ImagePreview({ open, url, onOpenChange }: { open: boolean; url: string | null; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[121] w-[min(96vw,1100px)] -translate-x-1/2 -translate-y-1/2 outline-none">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative">
            <Dialog.Close className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white">
              <X className="h-5 w-5" />
            </Dialog.Close>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob preview
              <img src={url} alt="" className="max-h-[85vh] w-full rounded-2xl object-contain" />
            ) : null}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
