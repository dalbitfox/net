import React, { useState, useEffect } from 'react';
import { database } from '../../firebase';
import { ref, onValue, push, remove, update } from 'firebase/database';
import './TodoApp.css';

// --- Recursive Component Defined Outside ---
const CommentItem = ({
    comment,
    taskId,
    depth = 1,
    replyInputs,
    toggleReplyInput,
    handleAddReply,
    handleEditComment,
    handleDeleteComment
}) => {
    const timeStr = new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <li className="inline-comment-item">
            <div className="comment-content-wrapper">
                {/* Indentation Visual for replies */}
                {depth > 1 && <span style={{ marginRight: '5px', color: 'var(--text-light)' }}>↳</span>}

                <div className="comment-bubble" style={depth > 1 ? { background: 'rgba(255,255,255,0.03)' } : {}}>
                    {comment.text}
                </div>

                <div className="comment-actions">
                    {/* Show Reply button only if depth < 10 */}
                    {depth < 10 && (
                        <button className="comment-action-btn" onClick={() => toggleReplyInput(comment.id)} title="답글">
                            ↩
                        </button>
                    )}
                    <button className="comment-action-btn" onClick={() => handleEditComment(taskId, comment.id, comment.text)} title="수정">
                        ✎
                    </button>
                    <button className="comment-action-btn delete-btn" onClick={() => handleDeleteComment(taskId, comment.id)} title="삭제">
                        🗑
                    </button>
                </div>
            </div>
            <span className="comment-meta" style={depth > 1 ? { marginLeft: '20px' } : {}}>{timeStr}</span>

            {/* Reply Input */}
            {replyInputs[comment.id] && (
                <div className="inline-input-group" style={{ display: 'flex', marginLeft: depth > 1 ? '20px' : '0', marginTop: '5px' }}>
                    <input
                        id={`reply-input-${comment.id}`}
                        type="text"
                        className="inline-comment-input"
                        placeholder="답글 작성..."
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleAddReply(taskId, comment.id, e.target.value);
                            }
                        }}
                    />
                    <button className="inline-add-btn" onClick={() => {
                        const input = document.getElementById(`reply-input-${comment.id}`);
                        handleAddReply(taskId, comment.id, input.value);
                    }}>
                        ↵
                    </button>
                </div>
            )}

            {/* Recursive Rendering of Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <ul className="inline-reply-list" style={{ marginLeft: '20px', marginTop: '5px', listStyle: 'none' }}>
                    {comment.replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            taskId={taskId}
                            depth={depth + 1}
                            replyInputs={replyInputs}
                            toggleReplyInput={toggleReplyInput}
                            handleAddReply={handleAddReply}
                            handleEditComment={handleEditComment}
                            handleDeleteComment={handleDeleteComment}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

const TodoApp = () => {
    // State
    const [tasks, setTasks] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [activePage, setActivePage] = useState(1);
    const ITEMS_PER_PAGE = 7;
    const [status, setStatus] = useState('Checking connection...');
    const [errorMsg, setErrorMsg] = useState(null);

    // input tracking
    const [commentInputs, setCommentInputs] = useState({}); // { taskId: boolean }
    const [replyInputs, setReplyInputs] = useState({}); // { commentId: boolean }

    const [dateString, setDateString] = useState('');

    useEffect(() => {
        updateDate();

        // 1. Connection Status Listener
        const connectedRef = ref(database, ".info/connected");
        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                setStatus("Connected to Server ✅");
            } else {
                setStatus("Server Disconnected ❌");
            }
        });

        // 2. Data Listener
        const tasksRef = ref(database, 'tasks');
        const unsubscribe = onValue(tasksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const tasksArray = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => b.createdAt - a.createdAt);
                setTasks(tasksArray);
            } else {
                setTasks([]);
            }
        }, (error) => {
            console.error("Firebase Read Error:", error);
            setErrorMsg("Read Error: " + error.message);
        });

        // 3. Diagnostic Helper
        const checkConnection = async () => {
            try {
                setStatus("Diagnostic: Pinging REST API...");
                const response = await fetch("https://netbox-b633b-default-rtdb.firebaseio.com/.json");
                if (response.ok) {
                    alert("REST API 통신 성공! (Database Exists and is Reachable)\n하지만 SDK 연결이 실패한다면 방화벽/Websocket 문제일 수 있습니다.");
                    setStatus("Rest OK / SDK Disconnected");
                } else {
                    alert(`REST API 응답 실패: ${response.status} ${response.statusText}\n(데이터베이스가 생성되지 않았거나 주소가 틀렸을 수 있습니다.)`);
                    setStatus(`Error: ${response.status}`);
                }
            } catch (err) {
                alert("네트워크 요청 실패 (인터넷 연결/CORS/차단됨): " + err.message);
                setStatus("Network Error");
            }
        };

        return () => unsubscribe();
    }, []);



    const updateDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setDateString(new Date().toLocaleDateString('ko-KR', options));
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleString('ko-KR', {
            hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric'
        });
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        setErrorMsg(null);
        if (!inputValue.trim()) return;



        const newTask = {
            text: inputValue,
            completed: false,
            createdAt: Date.now(),
            completedAt: null,
            comments: []
        };

        try {
            const tasksRef = ref(database, 'tasks');
            await push(tasksRef, newTask);
            setInputValue('');
            setActivePage(1);
        } catch (error) {
            console.error("Error adding task:", error);
            setErrorMsg("Write Error: " + error.message);
            alert("게시글 작성 실패: " + error.message);
        }
    };

    const handleDeleteTask = (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            const taskRef = ref(database, `tasks/${id}`);
            remove(taskRef).catch(err => {
                console.error(err);
                alert("삭제 실패: " + err.message);
            });
        }
    };

    const handleEditTask = (id) => {
        const task = tasks.find(t => t.id === id);
        const newText = window.prompt('내용을 수정하세요:', task.text);
        if (newText !== null && newText.trim()) {
            const taskRef = ref(database, `tasks/${id}`);
            update(taskRef, { text: newText.trim() }).catch(err => alert("수정 실패: " + err.message));
        }
    };

    // --- Recursive Comment Logic ---

    const updateCommentTree = (comments, targetId, updateFn) => {
        const safeComments = comments || [];
        return safeComments.map(comment => {
            if (comment.id === targetId) {
                return updateFn(comment);
            }
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: updateCommentTree(comment.replies, targetId, updateFn)
                };
            }
            return comment;
        });
    };

    const deleteFromCommentTree = (comments, targetId) => {
        const safeComments = comments || [];
        return safeComments.filter(comment => comment.id !== targetId).map(comment => {
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: deleteFromCommentTree(comment.replies, targetId)
                };
            }
            return comment;
        });
    };

    const toggleCommentInput = (id) => {
        setCommentInputs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const toggleReplyInput = (commentId) => {
        setReplyInputs(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const handleAddComment = (taskId, text) => {
        if (!text.trim()) return;
        const newComment = {
            id: Date.now().toString(),
            text: text,
            timestamp: Date.now(),
            replies: []
        };

        const task = tasks.find(t => t.id === taskId);
        const updatedComments = [...(task.comments || []), newComment];

        const taskRef = ref(database, `tasks/${taskId}`);
        update(taskRef, { comments: updatedComments }).catch(err => alert("댓글 작성 실패: " + err.message));

        setCommentInputs(prev => ({ ...prev, [taskId]: false }));
    };

    const handleAddReply = (taskId, parentCommentId, text) => {
        if (!text.trim()) return;
        const newReply = {
            id: Date.now().toString(),
            text: text,
            timestamp: Date.now(),
            replies: []
        };

        const task = tasks.find(t => t.id === taskId);
        const updatedComments = updateCommentTree(task.comments, parentCommentId, (parent) => ({
            ...parent,
            replies: [...(parent.replies || []), newReply]
        }));

        const taskRef = ref(database, `tasks/${taskId}`);
        update(taskRef, { comments: updatedComments }).catch(err => alert("답글 작성 실패: " + err.message));

        setReplyInputs(prev => ({ ...prev, [parentCommentId]: false }));
    };

    const handleEditComment = (taskId, commentId, currentText) => {
        const newText = window.prompt("댓글을 수정하세요:", currentText);
        if (newText !== null && newText.trim()) {
            const task = tasks.find(t => t.id === taskId);
            const updatedComments = updateCommentTree(task.comments, commentId, (c) => ({ ...c, text: newText.trim() }));

            const taskRef = ref(database, `tasks/${taskId}`);
            update(taskRef, { comments: updatedComments }).catch(err => alert("수정 실패: " + err.message));
        }
    };

    const handleDeleteComment = (taskId, commentId) => {
        if (window.confirm('삭제하시겠습니까?')) {
            const task = tasks.find(t => t.id === taskId);
            const updatedComments = deleteFromCommentTree(task.comments, commentId);

            const taskRef = ref(database, `tasks/${taskId}`);
            update(taskRef, { comments: updatedComments }).catch(err => alert("삭제 실패: " + err.message));
        }
    };

    const getPaginatedTasks = (items, page) => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return items.slice(start, start + ITEMS_PER_PAGE);
    };

    const visibleTasks = getPaginatedTasks(tasks, activePage);

    const renderPagination = (total, currentPage, setPage) => {
        const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        return (
            <div className="pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        className={`page-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setPage(page)}
                    >
                        {page}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black flex items-start justify-center p-8">
            <div className="todo-app-wrapper">
                {/* Header */}
                <header className="todo-header">
                    <div className="header-left">
                        <h1 style={{ cursor: 'default' }}>
                            <span style={{ fontSize: '2.5rem', marginRight: '15px' }}>📄</span>
                            편하게 말해요
                        </h1>
                        <p>{dateString}</p>
                    </div>
                </header>

                {/* Status Indicator */}
                <div style={{ padding: '0 1rem', marginBottom: '1rem', color: status.includes('Connected') ? '#4ade80' : '#ef4444', fontSize: '0.8rem' }}>
                    Status: {status}
                    {errorMsg && <div style={{ color: '#ef4444', marginTop: '5px' }}>Error: {errorMsg}</div>}
                </div>

                {/* Input */}
                <form onSubmit={handleAddTask} className="todo-input-group">
                    <input
                        type="text"
                        className="todo-input"
                        placeholder="내용을 입력하세요..."
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                    />
                    <button type="button" className="todo-add-btn" onClick={handleAddTask}>
                        +
                    </button>
                </form>

                {/* Tasks Container */}
                <div className="tasks-container" style={{ display: 'block' }}>

                    <div className="task-column">
                        <div className="column-header">
                            <h2>톡톡게시판</h2>
                            <span className="task-count">Total: {tasks.length}</span>
                        </div>
                        <ul className="task-list">
                            {visibleTasks.length === 0 ? (
                                <div className="empty-state">게시물이 없습니다.</div>
                            ) : visibleTasks.map(task => (
                                <li key={task.id} className="task-item">
                                    <div className="task-main">
                                        <div className="task-content">
                                            <span className="task-text" style={{ fontWeight: '500' }}>{task.text}</span>
                                        </div>
                                        <div className="task-actions">
                                            <button className="action-btn" onClick={() => toggleCommentInput(task.id)} title="댓글">
                                                💬
                                            </button>
                                            <button className="action-btn" onClick={() => handleEditTask(task.id)} title="수정">
                                                ✎
                                            </button>
                                            <button className="action-btn delete-btn" onClick={() => handleDeleteTask(task.id)} title="삭제">
                                                🗑
                                            </button>
                                        </div>
                                    </div>
                                    <div className="task-meta">
                                        <span>입력: {formatTime(task.createdAt)}</span>
                                    </div>

                                    {/* Inline Comments Area */}
                                    <div className="task-comments">
                                        <ul className="inline-comment-list">
                                            {task.comments && task.comments.map(comment => (
                                                <CommentItem
                                                    key={comment.id}
                                                    comment={comment}
                                                    taskId={task.id}
                                                    depth={1}
                                                    replyInputs={replyInputs}
                                                    toggleReplyInput={toggleReplyInput}
                                                    handleAddReply={handleAddReply}
                                                    handleEditComment={handleEditComment}
                                                    handleDeleteComment={handleDeleteComment}
                                                />
                                            ))}
                                        </ul>

                                        {/* Main Comment Input */}
                                        {commentInputs[task.id] && (
                                            <div className="inline-input-group" style={{ display: 'flex' }}>
                                                <input
                                                    id={`comment-input-${task.id}`}
                                                    type="text"
                                                    className="inline-comment-input"
                                                    placeholder="댓글 작성..."
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddComment(task.id, e.target.value);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                                <button className="inline-add-btn" onClick={() => {
                                                    const input = document.getElementById(`comment-input-${task.id}`);
                                                    handleAddComment(task.id, input.value);
                                                    input.value = '';
                                                }}>
                                                    ↑
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {renderPagination(tasks.length, activePage, setActivePage)}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TodoApp;
