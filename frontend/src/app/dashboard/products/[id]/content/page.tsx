'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { contentAPI, productsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
    FiPlus, FiEdit2, FiTrash2,
    FiVideo, FiFileText, FiArrowLeft, FiX, FiPlay,
    FiPaperclip, FiUpload, FiDownload, FiLink
} from 'react-icons/fi';

function getFileIcon(type: string) {
    if (!type) return <FiFileText size={16} />;
    if (type.startsWith('video/')) return <FiVideo size={16} />;
    if (type.startsWith('image/')) return <FiFileText size={16} />;
    return <FiFileText size={16} />;
}

export default function ContentEditorPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [showFilesModal, setShowFilesModal] = useState(false);
    const [editingModule, setEditingModule] = useState<any>(null);
    const [editingLesson, setEditingLesson] = useState<any>(null);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [activeLessonForFiles, setActiveLessonForFiles] = useState<any>(null);
    const [lessonFiles, setLessonFiles] = useState<any[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [linkForm, setLinkForm] = useState({ title: '', url: '' });
    const [showLinkForm, setShowLinkForm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [moduleForm, setModuleForm] = useState({ title: '', order: 0 });
    const [lessonForm, setLessonForm] = useState({
        title: '', description: '', video_url: '', video_source: 'youtube', order: 0, content: ''
    });

    const loadData = useCallback(async () => {
        try {
            const [prodRes, modRes] = await Promise.all([
                productsAPI.getById(productId),
                contentAPI.listModules(productId)
            ]);
            setProduct(prodRes.data.product);

            const modulesWithLessons = await Promise.all((modRes.data.modules || []).map(async (mod: any) => {
                const lessRes = await contentAPI.listLessons(mod.id);
                return { ...mod, lessons: lessRes.data.lessons || [] };
            }));

            setModules(modulesWithLessons);
        } catch (err) {
            toast.error('Erro ao carregar dados do produto');
            router.push('/dashboard/products');
        } finally {
            setLoading(false);
        }
    }, [productId, router]);

    useEffect(() => { loadData(); }, [loadData]);

    const openFilesModal = async (lesson: any) => {
        setActiveLessonForFiles(lesson);
        setShowFilesModal(true);
        setFilesLoading(true);
        setShowLinkForm(false);
        setLinkForm({ title: '', url: '' });
        try {
            const res = await contentAPI.listFiles(lesson.id);
            setLessonFiles(res.data.files || []);
        } catch {
            toast.error('Erro ao carregar arquivos');
        } finally {
            setFilesLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeLessonForFiles) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const res = await fetch('/api/upload-file', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro no upload');

            await contentAPI.addFile(activeLessonForFiles.id, {
                title: file.name,
                file_url: data.url,
                file_type: file.type || 'file'
            });

            toast.success('Arquivo enviado!');
            const updated = await contentAPI.listFiles(activeLessonForFiles.id);
            setLessonFiles(updated.data.files || []);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar arquivo');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLessonForFiles || !linkForm.title || !linkForm.url) return;
        try {
            await contentAPI.addFile(activeLessonForFiles.id, {
                title: linkForm.title,
                file_url: linkForm.url,
                file_type: 'link'
            });
            toast.success('Link adicionado!');
            setLinkForm({ title: '', url: '' });
            setShowLinkForm(false);
            const updated = await contentAPI.listFiles(activeLessonForFiles.id);
            setLessonFiles(updated.data.files || []);
        } catch {
            toast.error('Erro ao adicionar link');
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!confirm('Remover este arquivo?')) return;
        try {
            await contentAPI.deleteFile(fileId);
            setLessonFiles(prev => prev.filter(f => f.id !== fileId));
            toast.success('Arquivo removido!');
        } catch {
            toast.error('Erro ao remover arquivo');
        }
    };

    // Module Actions
    const handleModuleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingModule) {
                await contentAPI.updateModule(editingModule.id, moduleForm);
                toast.success('Módulo atualizado!');
            } else {
                await contentAPI.createModule(productId, moduleForm);
                toast.success('Módulo criado!');
            }
            setShowModuleModal(false);
            loadData();
        } catch {
            toast.error('Erro ao salvar módulo');
        }
    };

    const deleteModule = async (id: string) => {
        if (!confirm('Excluir este módulo e todas as suas aulas?')) return;
        try {
            await contentAPI.deleteModule(id);
            toast.success('Módulo excluído!');
            loadData();
        } catch {
            toast.error('Erro ao excluir módulo');
        }
    };

    // Lesson Actions
    const handleLessonSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeModuleId && !editingLesson) return;
        try {
            if (editingLesson) {
                await contentAPI.updateLesson(editingLesson.id, lessonForm);
                toast.success('Aula atualizada!');
            } else {
                await contentAPI.createLesson(activeModuleId!, lessonForm);
                toast.success('Aula criada!');
            }
            setShowLessonModal(false);
            loadData();
        } catch {
            toast.error('Erro ao salvar aula');
        }
    };

    const deleteLesson = async (id: string) => {
        if (!confirm('Excluir esta aula?')) return;
        try {
            await contentAPI.deleteLesson(id);
            toast.success('Aula excluída!');
            loadData();
        } catch {
            toast.error('Erro ao excluir aula');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <Link href="/dashboard/products" style={{
                    width: 40, height: 40, borderRadius: 12, background: 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                }}>
                    <FiArrowLeft size={18} />
                </Link>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Gerenciar Conteúdo</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{product?.name}</p>
                </div>
            </header>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>Módulos e Aulas</h2>
                <button className="btn-primary" onClick={() => {
                    setEditingModule(null);
                    setModuleForm({ title: '', order: modules.length + 1 });
                    setShowModuleModal(true);
                }} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <FiPlus size={16} /> Novo Módulo
                </button>
            </div>

            {modules.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center', opacity: 0.8 }}>
                    <FiFileText size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Nenhum módulo criado ainda. Comece criando o primeiro!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {modules.map((module) => (
                        <div key={module.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{
                                padding: '16px 24px', background: 'rgba(255,255,255,0.02)',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: 6, background: 'var(--accent-gradient)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white'
                                    }}>{module.order}</div>
                                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{module.title}</h3>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => {
                                        setEditingModule(module);
                                        setModuleForm({ title: module.title, order: module.order });
                                        setShowModuleModal(true);
                                    }} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}>
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button onClick={() => deleteModule(module.id)} className="btn-danger" style={{ padding: '6px 10px', fontSize: 12 }}>
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '16px 24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {module.lessons?.map((lesson: any) => (
                                        <div key={lesson.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10,
                                            border: '1px solid transparent', transition: 'all 0.2s'
                                        }} className="lesson-item">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <FiPlay size={14} style={{ color: 'var(--accent-secondary)' }} />
                                                <span style={{ fontSize: 14 }}>{lesson.title}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <button
                                                    onClick={() => openFilesModal(lesson)}
                                                    title="Gerenciar arquivos"
                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                                                >
                                                    <FiPaperclip size={14} /> Arquivos
                                                </button>
                                                <button onClick={() => {
                                                    setEditingLesson(lesson);
                                                    setLessonForm({
                                                        title: lesson.title,
                                                        description: lesson.description || '',
                                                        video_url: lesson.video_url || '',
                                                        video_source: lesson.video_source || 'youtube',
                                                        order: lesson.order,
                                                        content: lesson.content || ''
                                                    });
                                                    setActiveModuleId(module.id);
                                                    setShowLessonModal(true);
                                                }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                    <FiEdit2 size={14} />
                                                </button>
                                                <button onClick={() => deleteLesson(lesson.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }}>
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        setActiveModuleId(module.id);
                                        setEditingLesson(null);
                                        setLessonForm({ title: '', description: '', video_url: '', video_source: 'youtube', order: (module.lessons?.length || 0) + 1, content: '' });
                                        setShowLessonModal(true);
                                    }} style={{
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                                        background: 'none', border: '1px dashed var(--border-color)', borderRadius: 10,
                                        color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginTop: 4
                                    }}>
                                        <FiPlus size={14} /> Adicionar Aula
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Module Modal */}
            {showModuleModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 500, padding: 40 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editingModule ? 'Editar Módulo' : 'Novo Módulo'}</h3>
                            <button onClick={() => setShowModuleModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleModuleSubmit}>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Título do Módulo</label>
                                <input className="input-field" required value={moduleForm.title} onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })} placeholder="Ex: Introdução" />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Ordem</label>
                                <input type="number" className="input-field" value={moduleForm.order} onChange={e => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) })} />
                            </div>
                            <button className="btn-primary" style={{ width: '100%' }}>Salvar Módulo</button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Lesson Modal */}
            {showLessonModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 650, padding: 40, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{editingLesson ? 'Editar Aula' : 'Nova Aula'}</h3>
                            <button onClick={() => setShowLessonModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX size={20} /></button>
                        </div>
                        <form onSubmit={handleLessonSubmit}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Título da Aula</label>
                                <input className="input-field" required value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="Ex: Aula 01 - Boas vindas" />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>URL do Vídeo (YouTube/Vimeo)</label>
                                <input className="input-field" value={lessonForm.video_url} onChange={e => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Descrição da Aula</label>
                                <textarea className="input-field" rows={3} value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} placeholder="Explique o que será ensinado nesta aula..." />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Ordem</label>
                                <input type="number" className="input-field" value={lessonForm.order} onChange={e => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) })} />
                            </div>
                            <button className="btn-primary" style={{ width: '100%' }}>Salvar Aula</button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Files Modal */}
            {showFilesModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 600, padding: 40, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Materiais da Aula</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{activeLessonForFiles?.title}</p>
                            </div>
                            <button onClick={() => setShowFilesModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><FiX size={20} /></button>
                        </div>

                        {/* Upload & Link buttons */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                            <button
                                className="btn-primary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flex: 1 }}
                            >
                                <FiUpload size={14} />
                                {uploading ? 'Enviando...' : 'Subir Arquivo'}
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowLinkForm(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flex: 1 }}
                            >
                                <FiLink size={14} /> Adicionar Link
                            </button>
                        </div>

                        {/* Link form */}
                        {showLinkForm && (
                            <form onSubmit={handleAddLink} style={{ marginBottom: 20, padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Título do link</label>
                                    <input className="input-field" required value={linkForm.title} onChange={e => setLinkForm({ ...linkForm, title: e.target.value })} placeholder="Ex: Apostila PDF" style={{ fontSize: 13 }} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>URL</label>
                                    <input className="input-field" required type="url" value={linkForm.url} onChange={e => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://..." style={{ fontSize: 13 }} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn-primary" style={{ fontSize: 13 }}>Salvar</button>
                                    <button type="button" className="btn-secondary" onClick={() => setShowLinkForm(false)} style={{ fontSize: 13 }}>Cancelar</button>
                                </div>
                            </form>
                        )}

                        {/* Files list */}
                        {filesLoading ? (
                            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Carregando...</div>
                        ) : lessonFiles.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 10 }}>
                                <FiPaperclip size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                                <p style={{ fontSize: 13 }}>Nenhum arquivo ainda. Suba um arquivo ou adicione um link.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {lessonFiles.map((file: any) => (
                                    <div key={file.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 16px', background: 'var(--bg-secondary)',
                                        borderRadius: 10, border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ color: 'var(--accent-secondary)', flexShrink: 0 }}>
                                            {file.file_type === 'link' ? <FiLink size={16} /> : getFileIcon(file.file_type)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.title}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.file_type === 'link' ? 'Link externo' : file.file_type}</p>
                                        </div>
                                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                                            <FiDownload size={14} />
                                        </a>
                                        <button onClick={() => handleDeleteFile(file.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6, flexShrink: 0 }}>
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            <style jsx>{`
                .lesson-item:hover {
                    background: rgba(255,255,255,0.05) !important;
                    border-color: rgba(142,68,173,0.3) !important;
                    transform: translateX(4px);
                }
            `}</style>
        </div>
    );
}
