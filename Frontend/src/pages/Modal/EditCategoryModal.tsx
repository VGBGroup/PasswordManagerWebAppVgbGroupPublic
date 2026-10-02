import { useEffect, useState } from 'react';
import styles from '../../styles/Modals/CredentialStyles.module.css';
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Field, TextInput } from './CredentialModal';
import type { CategoriesInDto, CateogiesOutDto } from '@/interfaces/category';

interface DeletModalProps {
    onCreate: (item: Omit<CateogiesOutDto, 'id'>) => void;
    onEdit: (item: Omit<CateogiesOutDto, 'id'>) => void;
    onDelete: (recordId: number) => void;
    onReorder: (orderedRecordIds: number[]) => void; // NEW
    onClose: () => void;
    categories: CategoriesInDto[];
}

export function EditCategoryModal({ onClose, onCreate, onEdit, onDelete, onReorder, categories }: DeletModalProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [name, setName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");

    // NEW: local order state so we can reorder optimistically while dragging
    const [orderedCategories, setOrderedCategories] = useState<CategoriesInDto[]>(categories);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Keep local order in sync when the parent's categories list changes
    // (e.g. after create/delete), but don't fight an in-progress drag.
    useEffect(() => {
        if (draggedIndex === null) {
            setOrderedCategories(categories);
        }
    }, [categories, draggedIndex]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Name is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const createCategory = () => {
        if (!validate()) return;

        const category: CateogiesOutDto = {
            name: name
        };

        setName('');
        onCreate(category);
    }

    const handleStartEdit = (category: CategoriesInDto) => {
        setEditingId(category.recordId);
        setEditValue(category.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    const handleSaveEdit = (recordId: number) => {
        var category : CateogiesOutDto = {
            recordId: recordId,
            name: editValue
        }
        onEdit(category);

        setEditingId(null);
        setEditValue("");
    };

    // --- NEW: drag and drop handlers ---
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault(); // required to allow dropping
        if (draggedIndex === null || draggedIndex === index) return;

        setDragOverIndex(index);

        setOrderedCategories((prev) => {
            const next = [...prev];
            const [moved] = next.splice(draggedIndex, 1);
            next.splice(index, 0, moved);
            return next;
        });
        setDraggedIndex(index);
    };

    const handleDrop = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        onReorder(orderedCategories.map((c) => c.recordId));
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };
    // --- end drag and drop handlers ---

    return (
        /* Backdrop */
        <div
            className={styles.container}
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 100 }}
        >
            {/* Panel */}
            <div
                className={styles.inner}
                style={{
                    width: 480,
                    maxHeight: '88vh',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                    fontFamily: 'Inter, sans-serif',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    className={styles.header}
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <div>
                        <h2
                            style={{
                                fontSize: '1.2rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Edit Categories
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
                            Fill in the details to save to your vault
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={styles.button}
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
                        }}
                    >
                        <X size={18} className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.body} style={{ scrollbarWidth: 'none' }}>

                    {/* Name + favorite */}
                    <Field label="Name*">
                        <div className={styles.fieldContainer} style={{ width: '100%' }}>
                            <div className={styles.field}>
                                <TextInput
                                    placeholder="Category Name"
                                    value={name}
                                    onChange={setName}
                                />
                            </div>

                            <button
                                onClick={createCategory}
                                className={styles.buttonStar}
                                style={{ color: 'var(--primary)', backgroundColor: 'rgba(34,197,94,0.08)' }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.08)';
                                }}
                            >
                                <Plus size={20} className="w-4 h-4" />
                            </button>
                        </div>

                        {errors.name && (
                            <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                                {errors.name}
                            </p>
                        )}
                    </Field>

                    <Field label="Categories">
                        {orderedCategories.map((category, index) => {
                            const isEditing = editingId === category.recordId;
                            const isDragging = draggedIndex === index;
                            const isDragOver = dragOverIndex === index;

                            return (
                                <div
                                    key={category.recordId}
                                    draggable={!isEditing}
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={handleDrop}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingBlock: '0.5rem',
                                        borderBottom: '1px solid var(--border)',
                                        opacity: isDragging ? 0.4 : 1,
                                        backgroundColor: isDragOver ? 'var(--sidebar-accent)' : 'transparent',
                                        cursor: isEditing ? 'default' : 'grab',
                                    }}
                                >
                                    {/* Left side: drag handle + Category Name OR Text Input */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                        <GripVertical
                                            size={16}
                                            style={{
                                                color: 'var(--muted-foreground)',
                                                cursor: isEditing ? 'default' : 'grab',
                                                opacity: isEditing ? 0.3 : 1,
                                                flexShrink: 0,
                                            }}
                                        />
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                autoFocus
                                                style={{
                                                    fontSize: '0.9rem',
                                                    color: 'var(--foreground)',
                                                    background: 'var(--background)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '4px',
                                                    padding: '2px 6px',
                                                    outline: 'none'
                                                }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>
                                                {category.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right side: Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => handleSaveEdit(editingId)}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#22c55e', display: 'flex' }}
                                                    title="Save Changes"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
                                                    title="Cancel"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleStartEdit(category)}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex' }}
                                                    title="Edit Category"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(category.recordId)}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                                                    title="Delete Category"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </Field>
                </div>
            </div>
        </div>
    );
}