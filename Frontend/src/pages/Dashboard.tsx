import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/auth';
import { useNavigate } from 'react-router-dom';
import client from '@/api/client';
import styles from '../styles/HomeStyles.module.css';
import { ShieldCheck } from 'lucide-react';
import { Sidebar } from './Dashboard.Sidebar';
import { VaultList } from './SecondaryPages/VaultList';
import type { DecryptedInCredential, DecryptedOutCredential } from '@/interfaces/decryptedCredential';
import { getCredentials } from '@/functions/UpdateCredential';
import { AddCredentialModal } from './Modal/CredentialModal';
import { DeleteModal } from './Modal/Delete';
import { EditCategoryModal } from './Modal/EditCategoryModal';
import type { CategoriesInDto, CateogiesOutDto } from '@/interfaces/category';
import { getCategories } from '@/functions/UpdateCategories';
import { Audit } from './SecondaryPages/Audit';
import { SettingsView } from './SecondaryPages/Settings';
import { calculateAuditMetrics } from '@/functions/CalculateScore';
import { useAutoLock } from '@/functions/AutoLockProvider';
import { ProfileModal } from './Modal/ProfileModal';
import type { ProfileUpdateOutDto } from '@/interfaces/profile';
import { createInitials } from '@/functions/createInitials';
import { ImportCredentialsModal } from './Modal/ImportModal';
import { useToast } from './popups/ToastProvider';
import { ExportCredentialsModal } from './Modal/ExportCredentialsModal';
import { DeleteAccountModal } from './Modal/DeleteAccountModal';
import { useUIStore } from '@/stores/uiStore';

interface HomePageProps {
    isDark: boolean;
    setIsDark: (value: boolean) => void
}

export function Dashboard({ isDark, setIsDark }: HomePageProps) {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const { isLocked, updateTimeout, setAutoLockAuto } = useAutoLock();

    const {
        activeView,
        setActiveView,
        activeTypeCategory,
        setActiveTypeCategory,
        activeCategory,
        setActiveCategory
    } = useUIStore();
    
    const [selectedItemId, setSelectedItemId] = useState<number | null>(1);
    const [searchQuery, setSearchQuery] = useState('');

    const [credentials, setCredentials] = useState<DecryptedInCredential[]>([]);
    const [categories, setCategories] = useState<CategoriesInDto[]>([]);

    const { dataKey, logout, userId } = useAuthStore();
    const isInitialMount = useRef(true);
    const isSettingsLoaded = useRef(false);

    // Counts
    const [alert, setAlert] = useState(false);
    const [weakCount, setWeakCount] = useState<number>(0);

    // Settings
    const [darkMode, setDarkMode] = useState(false);
    const [autoLock, setAutoLock] = useState(false);
    const [autoLockNumb, setAutoLockNumb] = useState<number>(0);
    const [hide_credentials, setHideCredentials] = useState(false);
    const [clipboard_clear, setClipboardClear] = useState(false);
    const [twofa_enabled, setTwofaEnabled] = useState(false);
    const [security_alerts, setSecurityAlerts] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isAccountEditOpen, setIsAccountEditOpen] = useState(false);
    const [isCategoryOpen, setCategoryOpen] = useState(false);

    // Profiles
    const [displayName, setDisplayName] = useState('');
    const [initials, setInitials] = useState('');
    const [avatarColor, setAvatarColor] = useState('');

    const [importModal, setImportModal] = useState(false);
    const [exportModal, setExportModal] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [referalCode, setReferalCode] = useState('');

    // Subscription
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
    const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);

    const handleLogout = () => {
        logout();
        setIsDark(true);
        navigate('/login');
    };

    // If the timer expires, redirect out
    useEffect(() => {
        if (isLocked) {
            handleLogout();
            setAutoLockAuto(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLocked]);

    useEffect(() => {
        if (isSettingsLoaded.current) {
            console.log("set")
            const calculatedMs = autoLockNumb * 60 * 1000;
            setAutoLockAuto(autoLock);
            updateTimeout(calculatedMs, autoLock);
        }
    }, [autoLock, autoLockNumb]);

    async function CreateNewCredential(item: DecryptedOutCredential, dataKey: CryptoKey | null) {
        if (!dataKey) return;
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(JSON.stringify(item));
            const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, encoded);

            await client.post('credentials/create', {
                ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
                iv: btoa(String.fromCharCode(...iv)),
                categoryRecordId: item.categoryRecordId,
                hideUsername: item.hideUsername,
                favourite: item.favourite,
                color: item.color
            });
            await getCredentials(dataKey, setCredentials);
        } catch (err) {
            console.error(`Failed to seed ${item.name}:`, err);
        }
    }

    async function deleteCredentialAsync() {
        if (!dataKey) return;
        try {
            await client.delete(`credentials/${selectedItemId}`);
            await getCredentials(dataKey, setCredentials);
        } catch (err) {
            console.error(`Failed to delete ${selectedItemId}:`, err);
        }
    }

    async function updateCredential(
        id: number,
        updated: { name: string; username: string; password: string; website: string; notes: string; tags: string[], favourite: boolean, categoryRecordId: number }
    ) {
        if (!dataKey) throw new Error('No data key');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(updated));
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, encoded);

        await client.put(`credentials/${id}`, {
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
            iv: btoa(String.fromCharCode(...iv)),
            favourite: updated.favourite,
            categoryRecordId: updated.categoryRecordId
        });
        await getCredentials(dataKey, setCredentials);
    }

    async function createCategory(category: CateogiesOutDto) {
        if (!dataKey) return;
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(JSON.stringify(category));
            const name = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, encoded);

            await client.put('categories', {
                name: btoa(String.fromCharCode(...new Uint8Array(name))),
                iv: btoa(String.fromCharCode(...iv)),
            });
            await getCategories(dataKey, setCategories);
        } catch (err) {
            console.error(`Failed to seed ${category.name}:`, err);
        }
    }

    async function editCategory(category: CateogiesOutDto) {
        if (!dataKey) return;
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(JSON.stringify(category));
            const name = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, encoded);

            await client.post(`categories/${category.recordId}`, {
                name: btoa(String.fromCharCode(...new Uint8Array(name))),
                iv: btoa(String.fromCharCode(...iv)),
                recordId: category.recordId
            });
            await getCategories(dataKey, setCategories);
        } catch (err) {
            console.error(`Failed to seed ${category.name}:`, err);
        }
    }

    async function deleteCategory(categoryRecordId: number) {
        if (!dataKey) return;
        try {
            await client.delete(`categories/${categoryRecordId}`);
            await getCategories(dataKey, setCategories);
        } catch (err) {
            console.error(`Failed to delete ${categoryRecordId}:`, err);
        }
    }

    async function reorderCategories(orderedRecordIds: number[]) {
        if (!dataKey) return;
        try {
            await client.put('categories/reorder', { orderedRecordIds });
            await getCategories(dataKey, setCategories);
        } catch (err) {
            console.error('Failed to reorder categories:', err);
        }
    }

    async function updateProfile(profile: ProfileUpdateOutDto) {
        if (!dataKey) return;
        try {
            if (
                profile.displayName === undefined || userId === undefined
            ) return;

            setDisplayName(profile.displayName);

            await client.put('user/updateProfile', profile);
        } catch (error) {
            console.error("Failed to update profile:", error);
            throw error;
        }
    }

    const updateSettings = async () => {
        try {
            if (
                darkMode === undefined || autoLock === undefined ||
                hide_credentials === undefined || clipboard_clear === undefined ||
                twofa_enabled === undefined || security_alerts === undefined ||
                autoLockNumb === undefined
            ) return;

            const settingsData = {
                dark_mode: darkMode,
                auto_lock: autoLock,
                hide_credentials_default: hide_credentials,
                clipboard_clean: clipboard_clear,
                twofa: twofa_enabled,
                security_alerts: security_alerts,
                auto_lock_number: autoLockNumb
            };

            await client.put('user/updateSettings', settingsData);
            setIsDark(darkMode);
        } catch (error) {
            console.error("Failed to update settings:", error);
            throw error;
        }
    };

    const filteredItems = useMemo(() => {
        let items = credentials;
        if (activeCategory !== null) {
            items = items.filter((i) => i.categoryRecordId === activeCategory);
        }
        if (activeTypeCategory === 'favorites')
            items = items.filter(i => i.favourite);
        else if (activeTypeCategory && activeTypeCategory !== 'all')
            items = items.filter((i) => i.type === activeTypeCategory);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(i =>
                i.website?.toLowerCase().includes(q) ||
                i.name?.toLowerCase().includes(q) ||
                (i.tags && i.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }
        return [...items].sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0));
    }, [credentials, activeTypeCategory, searchQuery, activeCategory]);

    const selectedItem = filteredItems.find(i => i.recordId === selectedItemId) ?? filteredItems[0] ?? null;

    const fetchSettings = async () => {
        try {
            const userSettings = await client.get('user/getsettings');
            if (userSettings !== undefined && userSettings.data) {
                const settings = userSettings.data;

                setDarkMode(settings.dark_mode);
                setIsDark(settings.dark_mode);
                setAutoLock(settings.auto_lock);
                setAutoLockAuto(settings.auto_lock);
                setAutoLockNumb(settings.auto_lock_number);
                setHideCredentials(settings.hide_credentials_default);
                setClipboardClear(settings.clipboard_clean);
                setTwofaEnabled(settings.twofa);
                setSecurityAlerts(settings.security_alerts);

                const initialMs = settings.auto_lock_number * 60 * 1000;
                updateTimeout(initialMs, settings.auto_lock);

                isSettingsLoaded.current = true;
            }
        } catch (error) {
            console.error("Failed to fetch settings:", error);
        }
    };

    async function getProfile() {
        const response = await client.get('user/profile');

        if (!response?.data) return;

        setDisplayName(response.data.displayName);
        setInitials(createInitials(response.data.displayName));
        setAvatarColor(response.data.color);
    }

    async function getGeneralUserData() {
        const response = await client.get('user/generalData');

        if (!response?.data) return;

        if (response.data.referralCode !== undefined) {
            setReferalCode(response.data.referralCode);
        }
    }

    async function getSubscriptionStatus() {
        const response = await client.get('subscription/status');

        if (!response?.data) return;

        console.log("Subscription status response:", response.data.status);

        if (response.data.isActive !== undefined) {
            setIsSubscribed(response.data.isActive);
        }

        if (response.data.status !== undefined) {
            setSubscriptionPlan(response.data.status);
        }

        if (response.data.trialEndsAt !== undefined) {
            setIsSubscribed(true);
        }

        if (response.data.currentPeriodEnd !== undefined) {
            setSubscriptionEndDate(new Date(response.data.currentPeriodEnd));
        }
    }

    useEffect(() => {
        fetchSettings();
        if (dataKey) {
            getCredentials(dataKey, setCredentials);
            getCategories(dataKey, setCategories);
            getProfile();
            getSubscriptionStatus();
            getGeneralUserData();
        }
    }, []);

    useEffect(() => {
        const { totalIssues } = calculateAuditMetrics(credentials);
        if (totalIssues > 0 && security_alerts) {
            setAlert?.(true);
            setWeakCount?.(totalIssues);
        } else {
            setAlert?.(false);
            setWeakCount?.(0);
        }
    }, [credentials, security_alerts]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (!isSettingsLoaded.current) return;

        setIsDark(darkMode);
        const delayDebounceFn = setTimeout(() => {
            updateSettings();
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [darkMode, autoLock, hide_credentials, clipboard_clear, twofa_enabled, security_alerts, autoLockNumb]);

    // Redirect to Stripe Checkout (for Free users)
    const handleUpgrade = async () => {
        try {
            const res = await client.post('/subscription/checkout');
            if (res.data?.url) {
                window.location.href = res.data.url;
            }
        } catch (error) {
            console.error('Failed to initiate Stripe Checkout:', error);
        }
    };

    // Redirect to Stripe Portal (for Subscribed users)
    const handleManageSubscription = async () => {
        try {
            const res = await client.post('/subscription/portal');
            if (res.data?.url) {
                window.location.href = res.data.url;
            }
        } catch (error) {
            console.error('Failed to open Stripe Portal:', error);
        }
    };

    const activeSelectionText =
        activeTypeCategory === 'all' ? 'All Items' : activeTypeCategory === 'favorites' ? 'Favorites' : 
        activeTypeCategory === 'card' ? 'Cards' : activeTypeCategory === 'login' ? 'Logins' : 
        activeTypeCategory === 'identity' ? 'Identities' :
        categories.find(c => c.recordId === activeCategory)?.name || 'All Items'

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {isDeleteOpen && (
                <DeleteModal onClose={() => setIsDeleteOpen(false)} onConfirm={() => deleteCredentialAsync()} />
            )}
            {isCategoryOpen && (
                <EditCategoryModal onReorder={(orderedRecordIds) => reorderCategories(orderedRecordIds)} categories={categories} onDelete={(categoryRecordId: number) => deleteCategory(categoryRecordId)} onEdit={(item: CateogiesOutDto) => editCategory(item)} onCreate={(item: CateogiesOutDto) => createCategory(item)} onClose={() => setCategoryOpen(false)} />
            )}
            {isEditOpen && (
                <AddCredentialModal setCategoryOpen={setCategoryOpen} categories={categories} currentData={selectedItem} modalTitle='Edit Credential' onSave={(item: DecryptedOutCredential) => updateCredential(selectedItem.recordId, item)} onClose={() => setIsEditOpen(false)} />
            )}
            {isModalOpen && (
                <AddCredentialModal activeTypeCategory={activeTypeCategory ?? undefined} setCategoryOpen={setCategoryOpen} categories={categories} modalTitle='Add New Item' onSave={(item: DecryptedOutCredential) => CreateNewCredential(item, dataKey)} onClose={() => setIsModalOpen(false)} />
            )}
            {isAccountEditOpen && (
                <ProfileModal avatarColor={avatarColor} setAvatarColor={setAvatarColor} setInitials={setInitials} displayName={displayName} userId={userId} modalTitle='Edit Profile' onSave={(i: ProfileUpdateOutDto) => updateProfile(i)} onClose={() => setIsAccountEditOpen(false)} />
            )}
            {importModal && (
                <ImportCredentialsModal onImported={() => showToast("Import complete! Refresh page.", "success")} categories={categories} open={true} onClose={() => setImportModal(false)} />
            )}
            {exportModal && (
                <ExportCredentialsModal
                    open={exportModal}
                    onClose={() => setExportModal(false)}
                    twofaEnabled={twofa_enabled}
                />
            )}
            {deleteModalOpen && (
                <DeleteAccountModal
                    open={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    twofaEnabled={twofa_enabled}
                />
            )}

            <div
                className={styles.container}
                style={{
                    backgroundColor: 'var(--background)',
                    fontFamily: 'Inter, sans-serif',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                }}
            >
                <div
                    className={styles.leftPanel || styles['left-panel']}
                    style={{ borderRight: '1px solid var(--border)', height: '100%', overflowY: 'auto' }}
                >
                    <div className="logo-container" style={{ paddingLeft: '.5rem' }}>
                        <div className="logo" style={{ backgroundColor: 'var(--primary)' }}>
                            <ShieldCheck size={23} style={{ color: 'var(--primary-foreground)' }} />
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
                            V2 Vault
                        </span>
                    </div>

                    <Sidebar
                        setActiveView={setActiveView}
                        activeView={activeView}
                        isDark={isDark}
                        setDarkMode={setDarkMode}
                        logout={handleLogout}
                        username={userId}
                        items={credentials}
                        activeCategory={activeCategory}
                        setActiveCategory={setActiveCategory}
                        setActiveTypeCategory={setActiveTypeCategory}
                        activeTypeCategory={activeTypeCategory}
                        setCategoryModalVisibility={setCategoryOpen}
                        categories={categories}
                        alert={alert}
                        weakCount={weakCount}
                        initials={initials}
                        avatarColor={avatarColor}
                        displayName={displayName}
                    />
                </div>

                <div
                    className={styles.formPanel || styles['form-panel']}
                    style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                >
                    <div
                        className={styles.formContent || styles['form-content']}
                        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                    >
                        {activeView === 'vault' && (
                            <VaultList
                                items={filteredItems}
                                selectedItemId={selectedItemId}
                                setSelectedItemId={setSelectedItemId}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                selectedItem={selectedItem}
                                setCredentials={setCredentials}
                                setCredentialModalVisibility={setIsModalOpen}
                                setDeleteModalVisibilty={setIsDeleteOpen}
                                setEditModalVisibility={setIsEditOpen}
                                clipboard_clear={clipboard_clear}
                                hide_credentials={hide_credentials}
                                setCategoryModalVisibility={setCategoryOpen}
                                activeSelection={activeSelectionText}
                            />
                        )}
                        {activeView === "audit" && (
                            <Audit
                                setAlert={setAlert}
                                setWeakCount={setWeakCount}
                                items={credentials}
                                setSelectedItemId={setSelectedItemId}
                                setSearchQuery={setSearchQuery}
                                setEditModalVisibility={setIsEditOpen}
                                security_alerts={security_alerts}
                            />
                        )}
                        {activeView === "settings" && (
                            <SettingsView
                                setAutoLock={setAutoLock}
                                setTwofaEnabled={setTwofaEnabled}
                                setClipboardClear={setClipboardClear}
                                setHideCredentials={setHideCredentials}
                                setAutoLockNumb={setAutoLockNumb}
                                setSecurityAlerts={setSecurityAlerts}
                                setAccountEditModalVisibility={setIsAccountEditOpen}

                                twofa_enabled={twofa_enabled}
                                clipboard_clear={clipboard_clear}
                                hide_credentials={hide_credentials}
                                autoLock={autoLock}
                                autoLockNumb={autoLockNumb}
                                security_alerts={security_alerts}

                                initials={initials}
                                displayName={displayName}
                                email={userId}
                                avatarColor={avatarColor}

                                setImportModal={setImportModal}
                                setExportModal={setExportModal}
                                setDeleteModalOpen={setDeleteModalOpen}

                                isSubscribed={isSubscribed}
                                subscriptionPlan={subscriptionPlan ?? undefined}
                                subscriptionEndDate={subscriptionEndDate}
                                onUpgrade={handleUpgrade}
                                onManageSubscription={handleManageSubscription}
                                referralCode={referalCode}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}