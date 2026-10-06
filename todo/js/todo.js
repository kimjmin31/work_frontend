document.addEventListener("DOMContentLoaded", () => {
  // 요소 가져오기
  const todoForm = document.todoForm;
  const todoList = document.getElementById("todoList");
  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("submitBtn");
  const statsText = document.getElementById("statsText");

  let count = 0;         // 전체 개수
  let doneCount = 0;     // 완료 개수
  let editTarget = null; // 수정 중인 카드

  // 요소 만들기
  function make(tag, className, text) {
    const el = document.createElement(tag);
    el.setAttribute("class", className);
    el.textContent = text;
    return el;
  }

  // 입력칸 채우기
  function fillForm(date, subject, content) {
    todoForm.date.value = date;
    todoForm.subject.value = subject;
    todoForm.content.value = content;
  }

  // 현황 표시
  function updateStats() {
    if (count === 0) {
      statsText.textContent = "등록된 할일이 없습니다.";
      return;
    }
    const percent = Math.floor((doneCount / count) * 100);
    statsText.textContent = `전체 ${count}개 · 진행 중 ${count - doneCount}개 · 완료 ${doneCount}개 (${percent}%)`;
  }

  // 수정 모드 시작
  function startEdit(target) {
    if (editTarget) {
      endEdit();
    }
    editTarget = target;
    target.card.classList.toggle("editing");
    todoForm.classList.toggle("edit-mode");
    formTitle.textContent = "할일 수정";
    submitBtn.textContent = "수정 완료";
    fillForm(target.date, target.subject, target.text.textContent);
  }

  // 수정 모드 종료
  function endEdit() {
    editTarget.card.classList.toggle("editing");
    todoForm.classList.toggle("edit-mode");
    formTitle.textContent = "할일 등록";
    submitBtn.textContent = "등록하기";
    fillForm("", "", "");
    editTarget = null;
  }

  // 카드 만들기
  function createCard(date, subject, content) {
    let done = false;

    const card = make("div", "card", "");
    const titleBox = make("div", "mb-2 flex items-center gap-2", "");
    const checkBtn = make("button", "check-btn", "");
    const title = make("h3", "card-title", `[${date}] ${subject}`);
    const text = make("p", "card-text", content);
    const btnBox = make("div", "flex gap-1", "");
    const deleteBtn = make("button", "btn flex-1 bg-red-500", "삭제");
    const editBtn = make("button", "btn flex-1 bg-indigo-500", "수정");

    titleBox.prepend(checkBtn, title);
    btnBox.prepend(deleteBtn, editBtn);
    card.prepend(titleBox, text, btnBox);

    const target = { card: card, title: title, text: text, date: date, subject: subject };

    // 완료 체크
    checkBtn.addEventListener("click", () => {
      if (done) {
        done = false;
        doneCount -= 1;
        checkBtn.textContent = "";
      } else {
        done = true;
        doneCount += 1;
        checkBtn.textContent = "✓";
      }
      card.classList.toggle("done");
      updateStats();
    });

    // 수정
    editBtn.addEventListener("click", () => startEdit(target));

    // 삭제
    deleteBtn.addEventListener("click", () => {
      if (editTarget === target) {
        endEdit();
      }
      if (done) {
        doneCount -= 1;
      }
      card.remove();
      count -= 1;
      updateStats();
    });

    return card;
  }

  // 등록 / 수정 완료
  todoForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const date = todoForm.date.value;
    const subject = todoForm.subject.value;
    const content = todoForm.content.value;

    // 빈 칸 확인
    const isFilled = date.length > 0 && subject.length > 0 && content.length > 0;
    if (isFilled === false) {
      alert("날짜, 제목, 내용을 모두 입력해주세요.");
      return;
    }

    // 수정
    if (editTarget) {
      editTarget.date = date;
      editTarget.subject = subject;
      editTarget.title.textContent = `[${date}] ${subject}`;
      editTarget.text.textContent = content;
      endEdit();
      return;
    }

    // 등록
    todoList.prepend(createCard(date, subject, content));
    count += 1;
    updateStats();
    fillForm("", "", "");
  });

  // 수정 취소
  document.getElementById("cancelBtn").addEventListener("click", endEdit);

  updateStats();
});