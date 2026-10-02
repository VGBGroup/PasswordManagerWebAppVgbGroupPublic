import { useState } from 'react';
import styles from '../../styles/Modals/DeleteStyles.module.css';

interface DeletModalProps {
    onConfirm: () => void;
    onClose: () => void;
}

export function DeleteModal({ onClose, onConfirm }: DeletModalProps) {
    const [inputValue, setInputValue] = useState('');

    // Check if the user typed exactly "delete"
    const isInvalid = inputValue !== 'DELETE';

    const handleDelete = (e: any) => {
        e.preventDefault();
        if (!isInvalid) {
            onConfirm(); // Trigger the actual delete function
            onClose();
            setInputValue(''); // Clear input for next time
        }
    };

    const handleClose = () => {
        setInputValue(''); // Clear input when closing without deleting
        onClose()
    }
    return (
        <div className={styles.container} style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 50 }}>
            <div className={styles.item}>
                <h2>Are you sure?</h2>
                <p>This action cannot be undone. Type <strong>DELETE</strong> to confirm this action.</p>

                <form onSubmit={handleDelete}>
                    <input
                        type="text"
                        placeholder='Type "DELETE"'
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className={styles.inputField}
                    />

                    <div className={styles.buttonGroup}>
                        <button
                            type="button"
                            onClick={handleClose}
                            className={styles.cancelButton}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isInvalid}
                            className={styles.deleteButton}
                        >
                            Remove
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}