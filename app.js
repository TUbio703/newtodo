// src/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const dueDateInput = document.getElementById('due-date-input');
    const labelSelect = document.getElementById('label-select');
    const todoList = document.getElementById('todo-list');
    const completedTodoList = document.getElementById('completed-todo-list');
    const trashButton = document.getElementById('trash-button');
    const trashContainer = document.getElementById('trash-container');
    const closeTrashButton = document.getElementById('close-trash-button');
    const trashList = document.getElementById('trash-list');
    const filterButtons = document.getElementById('filter-buttons');
    const themeToggleButton = document.getElementById('theme-toggle-button');

    let draggedItem = null; // ドラッグ中のアイテムを保持する変数

    todoForm.addEventListener('submit', addTodo);
    todoList.addEventListener('click', handleTodoClick);
    completedTodoList.addEventListener('click', handleTodoClick);
    trashButton.addEventListener('click', () => trashContainer.classList.remove('hidden'));
    closeTrashButton.addEventListener('click', () => trashContainer.classList.add('hidden'));
    trashList.addEventListener('click', handleTrashClick);
    filterButtons.addEventListener('click', handleFilterClick);
    themeToggleButton.addEventListener('click', toggleTheme);


    // ドラッグ＆ドロップのイベントリスナーを両方のリストに追加
    [todoList, completedTodoList].forEach(list => {
        list.addEventListener('dragstart', handleDragStart);
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop', handleDrop);
        list.addEventListener('dragend', handleDragEnd);
    });

    // ページの読み込み時にローカルストレージからタスクを読み込む
    loadTasks();
    // ページの読み込み時にテーマを適用
    applyTheme();

    function addTodo(event) {
        event.preventDefault(); // フォーム送信によるページリロードを防止
        const todoText = todoInput.value.trim();
        const dueDate = dueDateInput.value;

        const labelValue = labelSelect.value;
        const labelText = labelSelect.options[labelSelect.selectedIndex].text;

        if (todoText === '') return;

        const todoItem = document.createElement('li');
        todoItem.classList.add('todo-item');

        createTodoElement(todoItem, { text: todoText, labelValue, labelText, dueDate });

        todoList.appendChild(todoItem);
        todoInput.value = '';
        dueDateInput.value = ''; // 期日入力欄もクリア

        // タスク追加後に状態を保存
        saveTasks();
    }

    // タスクのDOM要素を生成するヘルパー関数
    function createTodoElement(todoItem, task) {
        const { text, labelValue, labelText, completed, dueDate } = task;

        // ドラッグ可能にする
        todoItem.draggable = true;

        if (completed) todoItem.classList.add('completed');

        // ラベルが 'none' でない場合のみラベル要素を作成して追加
        if (labelValue !== 'none') {
            const labelSpan = document.createElement('span');
            labelSpan.textContent = labelText;
            labelSpan.classList.add('todo-label', `label-${labelValue}`);
            todoItem.appendChild(labelSpan);
        }

        // 期日要素を作成して追加
        if (dueDate) {
            const dueDateSpan = document.createElement('span');
            dueDateSpan.textContent = dueDate;
            dueDateSpan.classList.add('due-date');

            // 期日が過ぎているかチェック
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 今日の日付の0時0分0秒に設定
            if (!completed && new Date(dueDate) < today) {
                dueDateSpan.classList.add('overdue');
            }
            todoItem.appendChild(dueDateSpan);
        }

        const todoTextSpan = document.createElement('span');
        todoTextSpan.textContent = text;
        todoTextSpan.classList.add('todo-text');
        todoItem.appendChild(todoTextSpan);

        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');

        const completeButton = document.createElement('button');
        completeButton.textContent = completed ? '未完了' : '完了';
        completeButton.classList.add('complete-button');
        buttonContainer.appendChild(completeButton);

        const editButton = document.createElement('button');
        editButton.textContent = '編集';
        editButton.classList.add('edit-button');
        buttonContainer.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.classList.add('delete-button');
        buttonContainer.appendChild(deleteButton);

        todoItem.appendChild(buttonContainer);
    }

    function handleTodoClick(event) {
        // クリックされた要素がボタンでなければ、何もしない (イベントデリゲーションの最適化)
        if (!event.target.matches('button')) return;

        // クリックされたボタンに最も近い親の.todo-item要素(li)を取得
        const todoItem = event.target.closest('.todo-item');

        // 1. 削除ボタンが押された場合
        if (event.target.classList.contains('delete-button')) {
            // ゴミ箱に移動
            addToTrash(todoItem);
            // タスクアイテム(li)をリストから削除
            todoItem.parentElement.removeChild(todoItem);
            saveTasks(); // 通常のタスクリストの状態を保存
        }
        // 2. 完了/未完了ボタンが押された場合
        else if (event.target.classList.contains('complete-button')) {
            // タスクの完了状態を示す 'completed' クラスを付け外しする
            todoItem.classList.toggle('completed');

            // 完了状態になった場合
            if (todoItem.classList.contains('completed')) {
                // ボタンのテキストを「未完了」に変更し、完了済みリストに移動
                event.target.textContent = '未完了';
                completedTodoList.appendChild(todoItem);
            } else {
                // ボタンのテキストを「完了」に戻し、未完了リストに移動
                event.target.textContent = '完了';
                todoList.appendChild(todoItem);
            }
            // 状態変更後に保存
            saveTasks();
        }
        // 3. 編集/保存ボタンが押された場合
        else if (event.target.classList.contains('edit-button') || event.target.classList.contains('save-button')) {
            // 編集モードの切り替え処理を呼び出す
            toggleEditMode(todoItem);
        }
    }

    function toggleEditMode(todoItem) {
        const todoTextSpan = todoItem.querySelector('.todo-text');
        const labelSpan = todoItem.querySelector('.todo-label');
        const dueDateSpan = todoItem.querySelector('.due-date');
        const editButton = todoItem.querySelector('.edit-button, .save-button');

        // 編集モードから保存モードへ
        if (editButton.classList.contains('save-button')) {
            const editInput = todoItem.querySelector('.edit-input');
            const editLabelSelect = todoItem.querySelector('.edit-label-select');
            const editDateInput = todoItem.querySelector('.edit-date-input');

            // 1. テキストを更新
            todoTextSpan.textContent = editInput.value;
            todoTextSpan.style.display = ''; // spanを再表示

            // 2. ラベルを更新
            const newLabelValue = editLabelSelect.value;
            const newLabelText = editLabelSelect.options[editLabelSelect.selectedIndex].text;

            // 既存のラベルを一旦削除
            if (labelSpan) {
                todoItem.removeChild(labelSpan);
            }

            // 新しいラベルが 'none' でなければ、新しいラベルを作成して追加
            if (newLabelValue !== 'none') {
                const newLabelSpan = document.createElement('span');
                newLabelSpan.textContent = newLabelText;
                newLabelSpan.classList.add('todo-label', `label-${newLabelValue}`);
                todoItem.insertBefore(newLabelSpan, todoTextSpan);
            }

            // 3. 期日を更新
            const newDueDate = editDateInput.value;
            if (dueDateSpan) {
                todoItem.removeChild(dueDateSpan);
            }
            if (newDueDate) {
                const newDueDateSpan = document.createElement('span');
                newDueDateSpan.textContent = newDueDate;
                newDueDateSpan.classList.add('due-date');
                // 期日切れチェック
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (!todoItem.classList.contains('completed') && new Date(newDueDate) < today) {
                    newDueDateSpan.classList.add('overdue');
                }
                // ラベルがあればラベルの後、なければテキストの前に挿入
                const referenceNode = todoItem.querySelector('.todo-label') || todoTextSpan;
                todoItem.insertBefore(newDueDateSpan, referenceNode.nextSibling);
            }

            // 3. 編集用要素を削除
            todoItem.removeChild(editInput);
            todoItem.removeChild(editLabelSelect);
            todoItem.removeChild(editDateInput);

            // 4. ボタンを「編集」に戻す
            editButton.textContent = '編集';
            editButton.classList.remove('save-button');
            editButton.classList.add('edit-button');

            // 保存後に状態を保存
            saveTasks();
        }
        // 通常モードから編集モードへ
        else {
            // 1. ラベルを編集可能にする
            // ページ上部のラベル選択肢をコピーして編集用ドロップダウンを作成
            const editLabelSelect = labelSelect.cloneNode(true);
            editLabelSelect.classList.add('edit-label-select');

            // 現在のラベルを特定し、ドロップダウンのデフォルト値として設定
            if (labelSpan) {
                const currentLabelClass = Array.from(labelSpan.classList).find(cls => cls.startsWith('label-'));
                const currentLabelValue = currentLabelClass ? currentLabelClass.replace('label-', '') : 'none';
                editLabelSelect.value = currentLabelValue;
                // 元のラベル(span)を非表示にする
                labelSpan.style.display = 'none';
            } else {
                // ラベルがない場合は「-」を選択状態にする
                editLabelSelect.value = 'none';
            }
            // 編集用ドロップダウンをタスクアイテムに追加
            todoItem.insertBefore(editLabelSelect, todoTextSpan);            

            // 2. 期日を編集可能にする
            const editDateInput = document.createElement('input');
            editDateInput.type = 'date';
            editDateInput.classList.add('edit-date-input');
            if (dueDateSpan) {
                editDateInput.value = dueDateSpan.textContent;
                dueDateSpan.style.display = 'none';
            }
            // ラベル選択の後ろに挿入
            todoItem.insertBefore(editDateInput, editLabelSelect.nextSibling);


            // 2. テキストを編集可能にする
            // テキスト編集用のinput要素を作成
            const editInput = document.createElement('input');
            editInput.type = 'text';
            // 現在のテキストをinputの初期値に設定
            editInput.value = todoTextSpan.textContent;
            editInput.classList.add('edit-input');
            // 元のテキスト(span)を非表示にする
            todoTextSpan.style.display = 'none';
            // 編集用inputをタスクアイテムに追加
            todoItem.insertBefore(editInput, todoTextSpan);
            // inputに自動でフォーカスし、すぐ入力できるようにする
            editInput.focus();

            // 3. ボタンを「保存」に変更
            // ボタンのテキストを「保存」に変え、CSSクラスを'edit-button'から'save-button'に切り替える
            editButton.textContent = '保存';
            editButton.classList.remove('edit-button');
            editButton.classList.add('save-button');
        }
    }

    // 現在のタスクリストの状態をローカルストレージに保存する関数
    function saveTasks() {
        const tasks = [];
        // 未完了リストと完了リストの両方からタスク情報を収集
        document.querySelectorAll('.todo-item').forEach(todoItem => {
            const text = todoItem.querySelector('.todo-text').textContent;
            const completed = todoItem.classList.contains('completed');
            const dueDate = todoItem.querySelector('.due-date')?.textContent || '';
            const labelSpan = todoItem.querySelector('.todo-label');

            let labelValue = 'none';
            let labelText = '';
            if (labelSpan) {
                labelText = labelSpan.textContent;
                const labelClass = Array.from(labelSpan.classList).find(cls => cls.startsWith('label-'));
                labelValue = labelClass ? labelClass.replace('label-', '') : 'none';
            }

            tasks.push({ text, completed, labelValue, labelText, dueDate });
        });

        // オブジェクト配列をJSON文字列に変換してlocalStorageに保存
        localStorage.setItem('todos', JSON.stringify(tasks));
    }

    // ローカルストレージからタスクを読み込んで画面に表示する関数
    function loadTasks() {
        // localStorageからJSON文字列を取得
        const tasks = JSON.parse(localStorage.getItem('todos')) || [];
        const deletedTasks = JSON.parse(localStorage.getItem('deletedTodos')) || [];

        // データがなければ何もしない
        if (!tasks) return;

        tasks.forEach(task => {
            const todoItem = document.createElement('li');
            todoItem.classList.add('todo-item');

            // ヘルパー関数を使ってタスク要素を生成
            createTodoElement(todoItem, task);

            // 完了状態に応じて適切なリストに追加
            if (task.completed) {
                completedTodoList.appendChild(todoItem);
            } else {
                todoList.appendChild(todoItem);
            }
        });

        deletedTasks.forEach(task => {
            createTrashElement(task);
        });
    }

    // --- ドラッグ＆ドロップ関連の関数 ---

    function handleDragStart(event) {
        // ドラッグ対象がタスクアイテムの場合のみ処理
        if (event.target.classList.contains('todo-item')) {
            draggedItem = event.target;
            // ドラッグ中の要素にスタイルを適用
            setTimeout(() => {
                draggedItem.classList.add('dragging');
            }, 0);
        }
    }

    function handleDragOver(event) {
        event.preventDefault(); // ドロップを許可するために必須
        const overElement = event.target.closest('.todo-item');
        if (overElement && overElement !== draggedItem) {
            // ドラッグ先の要素にクラスを付けて、どこにドロップされるか視覚的に示す
            overElement.classList.add('drag-over');
        }
    }

    function handleDragLeave(event) {
        // マウスが要素から離れたら、視覚的なフィードバック用のクラスを削除
        const overElement = event.target.closest('.todo-item');
        if (overElement) {
            overElement.classList.remove('drag-over');
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        const dropTarget = event.target.closest('.todo-item');
        const list = event.target.closest('ul');

        if (dropTarget && list && draggedItem) {
            // ドロップ先の要素の前にドラッグ中の要素を挿入
            list.insertBefore(draggedItem, dropTarget);
        } else if (list && draggedItem) {
            // リストの末尾にドロップされた場合
            list.appendChild(draggedItem);
        }
    }

    function handleDragEnd() {
        if (draggedItem) {
            // ドラッグ中に追加したスタイルをすべて削除
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            saveTasks(); // 並び替え後の状態でタスクを保存
        }
    }

    // --- ゴミ箱関連の関数 ---

    function addToTrash(todoItem) {
        const text = todoItem.querySelector('.todo-text').textContent;
        const completed = todoItem.classList.contains('completed');
        const dueDate = todoItem.querySelector('.due-date')?.textContent || '';
        const labelSpan = todoItem.querySelector('.todo-label');

        let labelValue = 'none';
        let labelText = '';
        if (labelSpan) {
            labelText = labelSpan.textContent;
            const labelClass = Array.from(labelSpan.classList).find(cls => cls.startsWith('label-'));
            labelValue = labelClass ? labelClass.replace('label-', '') : 'none';
        }

        const deletedTask = { text, completed, labelValue, labelText, dueDate, deletedAt: new Date().toISOString() };

        // ゴミ箱UIに要素を追加
        createTrashElement(deletedTask);

        // localStorageのゴミ箱データを更新
        const deletedTasks = JSON.parse(localStorage.getItem('deletedTodos')) || [];
        deletedTasks.push(deletedTask);
        // 10件を超えたら古いものから削除
        if (deletedTasks.length > 10) {
            deletedTasks.shift();
        }
        localStorage.setItem('deletedTodos', JSON.stringify(deletedTasks));
    }

    function createTrashElement(task) {
        const trashItem = document.createElement('li');
        trashItem.className = 'todo-item';
        // 復元や完全削除のためにタスク情報をdatasetに保存
        trashItem.dataset.task = JSON.stringify(task);

        const textSpan = document.createElement('span');
        textSpan.className = 'todo-text';
        textSpan.textContent = task.text;
        trashItem.appendChild(textSpan);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const restoreButton = document.createElement('button');
        restoreButton.textContent = '復元';
        restoreButton.className = 'restore-button';
        buttonContainer.appendChild(restoreButton);

        const permanentDeleteButton = document.createElement('button');
        permanentDeleteButton.textContent = '完全削除';
        permanentDeleteButton.className = 'delete-button';
        buttonContainer.appendChild(permanentDeleteButton);

        trashItem.appendChild(buttonContainer);
        trashList.appendChild(trashItem);
    }

    function handleTrashClick(event) {
        if (!event.target.matches('button')) return;

        const trashItem = event.target.closest('.todo-item');
        const task = JSON.parse(trashItem.dataset.task);

        if (event.target.classList.contains('restore-button')) {
            // タスクを復元
            const todoItem = document.createElement('li');
            todoItem.className = 'todo-item';
            createTodoElement(todoItem, task);
            (task.completed ? completedTodoList : todoList).appendChild(todoItem);
        }

        // ゴミ箱からアイテムを削除（復元でも完全削除でも共通）
        trashItem.remove();
        const deletedTasks = JSON.parse(localStorage.getItem('deletedTodos')) || [];
        const updatedDeletedTasks = deletedTasks.filter(t => t.deletedAt !== task.deletedAt);
        localStorage.setItem('deletedTodos', JSON.stringify(updatedDeletedTasks));
        if (event.target.classList.contains('restore-button')) saveTasks();
    }

    // --- フィルタリング関連の関数 ---

    function handleFilterClick(event) {
        if (!event.target.classList.contains('filter-btn')) return;

        // すべてのフィルターボタンから 'active' クラスを削除
        filterButtons.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        // クリックされたボタンに 'active' クラスを追加
        event.target.classList.add('active');

        const filter = event.target.dataset.filter;

        // 未完了・完了リストの両方のタスクをフィルタリング
        document.querySelectorAll('.todo-item').forEach(item => {
            // ゴミ箱内のアイテムはフィルタリング対象外
            if (item.closest('#trash-list')) return;

            if (filter === 'all') {
                item.classList.remove('hidden');
            } else {
                const label = item.querySelector(`.label-${filter}`);
                // ラベルが存在すれば表示、しなければ非表示
                item.classList.toggle('hidden', !label);
            }
        });
    }

    // --- テーマ切り替え関連の関数 ---

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');

        // 現在のテーマをlocalStorageに保存
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

        // ボタンの絵文字を更新
        themeToggleButton.textContent = isDarkMode ? '🌙' : '☀️';
    }

    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleButton.textContent = '🌙';
        }
    }
});