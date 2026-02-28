document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.section');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the section is visible
    });

    sections.forEach(section => {
        observer.observe(section);
    });

    // Hamburger menu functionality
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });

        // Close nav menu when a link is clicked
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Chatbot functionality
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInputField = document.getElementById('chatbot-input-field');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotResizeHandle = document.getElementById('chatbot-resize-handle');

    if (chatbotToggle && chatbotWindow && chatbotClose && chatbotMessages && chatbotInputField && chatbotSend) {
        chatbotToggle.addEventListener('click', () => {
            chatbotWindow.classList.toggle('open');
        });

        chatbotClose.addEventListener('click', () => {
            chatbotWindow.classList.remove('open');
        });

        const appendMessage = (text, isUser) => {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(isUser ? 'user-message' : 'bot-message');
            messageElement.textContent = text;
            chatbotMessages.appendChild(messageElement);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        };

        const sendMessage = () => {
            const text = chatbotInputField.value.trim();
            if (!text) return;

            appendMessage(text, true);
            chatbotInputField.value = '';
            chatbotInputField.focus();

            // Используем относительный путь, если сайт запущен через наш сервер (3001),
            // либо абсолютный, если через Live Server (5500 и т.д.)
            const apiPath = window.location.port === '3001' ? '/api/chat' : 'http://localhost:3001/api/chat';

            fetch(apiPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            })
                .then(async response => {
                    let data = null;
                    try {
                        data = await response.json();
                    } catch (e) {
                    }

                    if (!response.ok) {
                        const message =
                            data && data.reply
                                ? data.reply
                                : 'Сейчас я временно недоступен. Попробуйте ещё раз чуть позже.';
                        throw new Error(message);
                    }

                    if (!data || !data.reply) {
                        throw new Error('Не удалось получить ответ от сервера.');
                    }

                    return data.reply;
                })
                .then(reply => {
                    const lastMessage = chatbotMessages.lastElementChild;
                    if (lastMessage && lastMessage.classList.contains('bot-message') && lastMessage.textContent === 'Думаю над ответом...') {
                        chatbotMessages.removeChild(lastMessage);
                    }

                    appendMessage(reply, false);
                })
                .catch(error => {
                    const lastMessage = chatbotMessages.lastElementChild;
                    if (lastMessage && lastMessage.classList.contains('bot-message') && lastMessage.textContent === 'Думаю над ответом...') {
                        chatbotMessages.removeChild(lastMessage);
                    }
                    const message =
                        error && error.message
                            ? error.message
                            : 'Сейчас я временно недоступен. Попробуйте ещё раз чуть позже.';
                    appendMessage(message, false);
                });
        };

        chatbotSend.addEventListener('click', sendMessage);

        chatbotInputField.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        if (chatbotResizeHandle) {
            let isResizing = false;
            let startY = 0;
            let startHeight = 0;

            const onMouseMove = event => {
                if (!isResizing) return;
                const deltaY = event.clientY - startY;
                let newHeight = startHeight - deltaY;
                const minHeight = 320;
                const maxHeight = Math.min(window.innerHeight - 120, 720);
                if (newHeight < minHeight) newHeight = minHeight;
                if (newHeight > maxHeight) newHeight = maxHeight;
                chatbotWindow.style.height = `${newHeight}px`;
            };

            const stopResizing = () => {
                if (!isResizing) return;
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', stopResizing);
            };

            chatbotResizeHandle.addEventListener('mousedown', event => {
                isResizing = true;
                startY = event.clientY;
                startHeight = chatbotWindow.offsetHeight;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', stopResizing);
            });
        }
    } else {
        console.error('Chatbot elements not found!', {
            chatbotToggle,
            chatbotWindow,
            chatbotClose,
            chatbotMessages,
            chatbotInputField,
            chatbotSend
        });
    }
});
