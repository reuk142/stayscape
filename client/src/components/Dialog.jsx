import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="review-modal native-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="modal-close" aria-label="Close dialog" onClick={onClose}><X size={20}/></button>
    <h2 id="dialog-title">{title}</h2>{children}
  </dialog>;
}
