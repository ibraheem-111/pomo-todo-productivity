import {
  AlertCircle,
  Archive,
  Check,
  Circle,
  Clock3,
  FolderKanban,
  Inbox,
  ListTodo,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  TimerReset,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type View = "today" | "inbox" | "projects" | "focus" | "review";
type TaskStatus = "inbox" | "today" | "done" | "deferred";
type ProjectStatus = "active" | "paused" | "done";
type Energy = "low" | "medium" | "high";
type SessionStatus = "running" | "completed" | "cancelled";
type LessonTrigger = "before_focus" | "after_focus" | "overwhelmed" | "daily_review";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  projectId?: string;
  dueAt?: string;
  reminderAt?: string;
  energy: Energy;
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  nextActionId?: string;
  notesUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type FocusSession = {
  id: string;
  taskId?: string;
  projectId?: string;
  durationMinutes: number;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
  reflection?: string;
};

type Lesson = {
  id: string;
  text: string;
  tags: string[];
  trigger: LessonTrigger;
};

type AppState = {
  tasks: Task[];
  projects: Project[];
  sessions: FocusSession[];
  lessons: Lesson[];
};

const STORAGE_KEY = "pomo-todo-productivity:v1";
const DEFAULT_FOCUS_SECONDS = 25 * 60;
const QUICK_FOCUS_SECONDS = 5 * 60;

const nowIso = () => new Date().toISOString();
const createId = () => crypto.randomUUID();

const seedState: AppState = {
  tasks: [
    {
      id: createId(),
      title: "Define the smallest useful first version",
      status: "today",
      energy: "low",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: createId(),
      title: "Capture loose commitments without sorting them yet",
      status: "inbox",
      energy: "low",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ],
  projects: [
    {
      id: createId(),
      name: "Personal focus system",
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ],
  sessions: [],
  lessons: [
    {
      id: createId(),
      text: "When anxious, define the next visible action before judging the whole project.",
      tags: ["anxiety", "planning"],
      trigger: "overwhelmed",
    },
    {
      id: createId(),
      text: "Five minutes counts. Starting is the point of the first session.",
      tags: ["focus", "avoidance"],
      trigger: "before_focus",
    },
    {
      id: createId(),
      text: "After a session, write what made it easier or harder. That becomes future instruction.",
      tags: ["review", "learning"],
      trigger: "after_focus",
    },
  ],
};

function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedState;

  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return seedState;
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function formatShortDate(value?: string) {
  if (!value) return "none";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>("today");
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    () => state.tasks.find((task) => task.status === "today")?.id,
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [lessonText, setLessonText] = useState("");
  const [reflection, setReflection] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_FOCUS_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [overwhelmed, setOverwhelmed] = useState(false);
  const [captureText, setCaptureText] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!timerRunning) return;

    const interval = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        if (seconds <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const selectedTask = state.tasks.find((task) => task.id === selectedTaskId);
  const todayTasks = state.tasks.filter((task) => task.status === "today");
  const inboxTasks = state.tasks.filter((task) => task.status === "inbox");
  const openTasks = state.tasks.filter((task) => task.status !== "done");
  const activeProjects = state.projects.filter((project) => project.status === "active");
  const completedSessions = state.sessions.filter((session) => session.status === "completed");
  const focusLesson = useMemo(
    () =>
      state.lessons.find((lesson) => lesson.trigger === (overwhelmed ? "overwhelmed" : "before_focus")) ??
      state.lessons[0],
    [overwhelmed, state.lessons],
  );

  function updateState(updater: (current: AppState) => AppState) {
    setState((current) => updater(current));
  }

  function addTask(event: FormEvent) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;

    const task: Task = {
      id: createId(),
      title,
      status: view === "today" ? "today" : "inbox",
      energy: "medium",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    updateState((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    setTaskTitle("");
    setSelectedTaskId(task.id);
  }

  function addProject(event: FormEvent) {
    event.preventDefault();
    const name = projectName.trim();
    if (!name) return;

    const project: Project = {
      id: createId(),
      name,
      status: "active",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    updateState((current) => ({ ...current, projects: [project, ...current.projects] }));
    setProjectName("");
  }

  function addLesson(event: FormEvent) {
    event.preventDefault();
    const text = lessonText.trim();
    if (!text) return;

    const lesson: Lesson = {
      id: createId(),
      text,
      tags: ["personal"],
      trigger: "daily_review",
    };

    updateState((current) => ({ ...current, lessons: [lesson, ...current.lessons] }));
    setLessonText("");
  }

  function updateTask(taskId: string, patch: Partial<Task>) {
    updateState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === taskId ? { ...task, ...patch, updatedAt: nowIso() } : task,
      ),
    }));
  }

  function updateProject(projectId: string, patch: Partial<Project>) {
    updateState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch, updatedAt: nowIso() } : project,
      ),
    }));
  }

  function startTimer(seconds = DEFAULT_FOCUS_SECONDS) {
    if (!activeSessionId) {
      const session: FocusSession = {
        id: createId(),
        taskId: selectedTaskId,
        projectId: selectedTask?.projectId,
        durationMinutes: Math.round(seconds / 60),
        startedAt: nowIso(),
        status: "running",
      };

      updateState((current) => ({ ...current, sessions: [session, ...current.sessions] }));
      setActiveSessionId(session.id);
    }

    setTimerSeconds((currentSeconds) => (currentSeconds === 0 ? seconds : currentSeconds));
    setTimerRunning(true);
    setView("focus");
  }

  function resetTimer(seconds = DEFAULT_FOCUS_SECONDS) {
    setTimerRunning(false);
    setTimerSeconds(seconds);
    setActiveSessionId(undefined);
  }

  function completeSession() {
    if (!activeSessionId) return;

    updateState((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              endedAt: nowIso(),
              reflection: reflection.trim() || undefined,
              status: "completed",
            }
          : session,
      ),
    }));
    setTimerRunning(false);
    setTimerSeconds(DEFAULT_FOCUS_SECONDS);
    setActiveSessionId(undefined);
    setReflection("");
  }

  function quickCapture(event: FormEvent) {
    event.preventDefault();
    const title = captureText.trim();
    if (!title) return;

    const task: Task = {
      id: createId(),
      title,
      status: "inbox",
      energy: "low",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    updateState((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    setCaptureText("");
  }

  return (
    <div className={overwhelmed ? "app overwhelmed" : "app"}>
      <aside className="sidebar">
        <div className="brand">
          <span className="prompt">$</span>
          <span>focusctl</span>
        </div>
        <nav className="nav">
          <NavButton active={view === "today"} icon={<ListTodo size={16} />} label="today" onClick={() => setView("today")} />
          <NavButton active={view === "inbox"} icon={<Inbox size={16} />} label="inbox" onClick={() => setView("inbox")} />
          <NavButton active={view === "projects"} icon={<FolderKanban size={16} />} label="projects" onClick={() => setView("projects")} />
          <NavButton active={view === "focus"} icon={<Clock3 size={16} />} label="focus" onClick={() => setView("focus")} />
          <NavButton active={view === "review"} icon={<Archive size={16} />} label="review" onClick={() => setView("review")} />
        </nav>
        <button className="panic-toggle" onClick={() => setOverwhelmed((value) => !value)}>
          <AlertCircle size={16} />
          <span>{overwhelmed ? "normal" : "overwhelmed"}</span>
        </button>
      </aside>

      <main className="workspace">
        <header className="statusbar">
          <div>
            <span className="muted">mode</span> <strong>{overwhelmed ? "overwhelmed" : view}</strong>
          </div>
          <div>
            <span className="muted">timer</span> <strong>{formatTime(timerSeconds)}</strong>
          </div>
          <div>
            <span className="muted">tasks</span> <strong>{openTasks.length} open</strong>
          </div>
        </header>

        <section className="commandline">
          <Search size={16} />
          <span className="muted">/</span>
          <span>{selectedTask?.title ?? "select a task to focus"}</span>
        </section>

        {overwhelmed ? (
          <OverwhelmedMode
            captureText={captureText}
            focusLesson={focusLesson}
            onCapture={quickCapture}
            onCaptureTextChange={setCaptureText}
            onStartQuick={() => {
              setTimerSeconds(QUICK_FOCUS_SECONDS);
              startTimer(QUICK_FOCUS_SECONDS);
            }}
            selectedTask={selectedTask}
          />
        ) : (
          <>
            {view === "today" && (
              <TodayView
                onAddTask={addTask}
                onSelectTask={setSelectedTaskId}
                onStartFocus={() => startTimer(DEFAULT_FOCUS_SECONDS)}
                onTaskTitleChange={setTaskTitle}
                onUpdateTask={updateTask}
                projects={state.projects}
                selectedTaskId={selectedTaskId}
                taskTitle={taskTitle}
                tasks={todayTasks}
              />
            )}
            {view === "inbox" && (
              <InboxView
                onAddTask={addTask}
                onSelectTask={setSelectedTaskId}
                onTaskTitleChange={setTaskTitle}
                onUpdateTask={updateTask}
                selectedTaskId={selectedTaskId}
                taskTitle={taskTitle}
                tasks={inboxTasks}
              />
            )}
            {view === "projects" && (
              <ProjectsView
                onAddProject={addProject}
                onProjectNameChange={setProjectName}
                onUpdateProject={updateProject}
                projectName={projectName}
                projects={state.projects}
                tasks={state.tasks}
              />
            )}
            {view === "focus" && (
              <FocusView
                activeSessionId={activeSessionId}
                focusLesson={focusLesson}
                onComplete={completeSession}
                onPause={() => setTimerRunning(false)}
                onReflectionChange={setReflection}
                onReset={() => resetTimer(DEFAULT_FOCUS_SECONDS)}
                onStart={() => startTimer(DEFAULT_FOCUS_SECONDS)}
                reflection={reflection}
                selectedTask={selectedTask}
                timerRunning={timerRunning}
                timerSeconds={timerSeconds}
              />
            )}
            {view === "review" && (
              <ReviewView
                completedSessions={completedSessions}
                lessonText={lessonText}
                lessons={state.lessons}
                onAddLesson={addLesson}
                onLessonTextChange={setLessonText}
                projects={activeProjects}
                tasks={openTasks}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TaskList({
  onSelectTask,
  onUpdateTask,
  projects = [],
  selectedTaskId,
  tasks,
}: {
  onSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  projects?: Project[];
  selectedTaskId?: string;
  tasks: Task[];
}) {
  if (tasks.length === 0) {
    return <p className="empty">no tasks in this queue</p>;
  }

  return (
    <div className="list">
      {tasks.map((task) => (
        <div className={task.id === selectedTaskId ? "row selected" : "row"} key={task.id}>
          <button className="icon-button" title="complete task" onClick={() => onUpdateTask(task.id, { status: "done" })}>
            {task.status === "done" ? <Check size={16} /> : <Circle size={16} />}
          </button>
          <button className="row-main" onClick={() => onSelectTask(task.id)}>
            <span>{task.title}</span>
            <small>
              {task.energy} energy · reminder {formatShortDate(task.reminderAt)}
            </small>
          </button>
          {projects.length > 0 && (
            <select
              aria-label="project"
              value={task.projectId ?? ""}
              onChange={(event) => onUpdateTask(task.id, { projectId: event.target.value || undefined })}
            >
              <option value="">no project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
          {task.status === "inbox" ? (
            <button className="text-button" onClick={() => onUpdateTask(task.id, { status: "today" })}>
              today
            </button>
          ) : (
            <button className="text-button" onClick={() => onUpdateTask(task.id, { status: "deferred" })}>
              defer
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskComposer({
  onAddTask,
  onTaskTitleChange,
  taskTitle,
}: {
  onAddTask: (event: FormEvent) => void;
  onTaskTitleChange: (value: string) => void;
  taskTitle: string;
}) {
  return (
    <form className="composer" onSubmit={onAddTask}>
      <span className="prompt">&gt;</span>
      <input
        autoComplete="off"
        placeholder="new task"
        value={taskTitle}
        onChange={(event) => onTaskTitleChange(event.target.value)}
      />
      <button className="icon-button" title="add task">
        <Plus size={16} />
      </button>
    </form>
  );
}

function TodayView(props: {
  onAddTask: (event: FormEvent) => void;
  onSelectTask: (taskId: string) => void;
  onStartFocus: () => void;
  onTaskTitleChange: (value: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  projects: Project[];
  selectedTaskId?: string;
  taskTitle: string;
  tasks: Task[];
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">today</p>
          <h1>Current queue</h1>
        </div>
        <button className="primary-action" onClick={props.onStartFocus}>
          <Play size={16} />
          <span>start</span>
        </button>
      </div>
      <TaskComposer {...props} />
      <TaskList {...props} />
    </section>
  );
}

function InboxView(props: {
  onAddTask: (event: FormEvent) => void;
  onSelectTask: (taskId: string) => void;
  onTaskTitleChange: (value: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  selectedTaskId?: string;
  taskTitle: string;
  tasks: Task[];
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">inbox</p>
          <h1>Raw capture</h1>
        </div>
      </div>
      <TaskComposer {...props} />
      <TaskList {...props} />
    </section>
  );
}

function ProjectsView({
  onAddProject,
  onProjectNameChange,
  onUpdateProject,
  projectName,
  projects,
  tasks,
}: {
  onAddProject: (event: FormEvent) => void;
  onProjectNameChange: (value: string) => void;
  onUpdateProject: (projectId: string, patch: Partial<Project>) => void;
  projectName: string;
  projects: Project[];
  tasks: Task[];
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">projects</p>
          <h1>Active outcomes</h1>
        </div>
      </div>
      <form className="composer" onSubmit={onAddProject}>
        <span className="prompt">&gt;</span>
        <input
          autoComplete="off"
          placeholder="new project"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
        />
        <button className="icon-button" title="add project">
          <Plus size={16} />
        </button>
      </form>
      <div className="project-grid">
        {projects.map((project) => {
          const projectTasks = tasks.filter((task) => task.projectId === project.id && task.status !== "done");
          const nextAction = tasks.find((task) => task.id === project.nextActionId);

          return (
            <article className="project-card" key={project.id}>
              <div className="project-title">
                <h2>{project.name}</h2>
                <select
                  aria-label="project status"
                  value={project.status}
                  onChange={(event) => onUpdateProject(project.id, { status: event.target.value as ProjectStatus })}
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="done">done</option>
                </select>
              </div>
              <label>
                <span>next action</span>
                <select
                  value={project.nextActionId ?? ""}
                  onChange={(event) => onUpdateProject(project.id, { nextActionId: event.target.value || undefined })}
                >
                  <option value="">unset</option>
                  {projectTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>docs url</span>
                <input
                  placeholder="https://docs.google.com/..."
                  value={project.notesUrl ?? ""}
                  onChange={(event) => onUpdateProject(project.id, { notesUrl: event.target.value || undefined })}
                />
              </label>
              <p className="muted">{nextAction?.title ?? "no next action selected"}</p>
              {project.notesUrl && (
                <a className="doc-link" href={project.notesUrl} rel="noreferrer" target="_blank">
                  open notes
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FocusView({
  activeSessionId,
  focusLesson,
  onComplete,
  onPause,
  onReflectionChange,
  onReset,
  onStart,
  reflection,
  selectedTask,
  timerRunning,
  timerSeconds,
}: {
  activeSessionId?: string;
  focusLesson?: Lesson;
  onComplete: () => void;
  onPause: () => void;
  onReflectionChange: (value: string) => void;
  onReset: () => void;
  onStart: () => void;
  reflection: string;
  selectedTask?: Task;
  timerRunning: boolean;
  timerSeconds: number;
}) {
  return (
    <section className="focus-panel">
      <p className="eyebrow">focus</p>
      <h1>{selectedTask?.title ?? "No task selected"}</h1>
      <div className="timer">{formatTime(timerSeconds)}</div>
      <p className="lesson">{focusLesson?.text}</p>
      <div className="control-row">
        {timerRunning ? (
          <button className="primary-action" onClick={onPause}>
            <Pause size={16} />
            <span>pause</span>
          </button>
        ) : (
          <button className="primary-action" onClick={onStart}>
            <Play size={16} />
            <span>{activeSessionId ? "resume" : "start"}</span>
          </button>
        )}
        <button className="icon-button large" title="reset timer" onClick={onReset}>
          <RotateCcw size={18} />
        </button>
        <button className="icon-button large" title="complete session" onClick={onComplete} disabled={!activeSessionId}>
          <Square size={18} />
        </button>
      </div>
      <textarea
        placeholder="session reflection"
        value={reflection}
        onChange={(event) => onReflectionChange(event.target.value)}
      />
    </section>
  );
}

function ReviewView({
  completedSessions,
  lessonText,
  lessons,
  onAddLesson,
  onLessonTextChange,
  projects,
  tasks,
}: {
  completedSessions: FocusSession[];
  lessonText: string;
  lessons: Lesson[];
  onAddLesson: (event: FormEvent) => void;
  onLessonTextChange: (value: string) => void;
  projects: Project[];
  tasks: Task[];
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">review</p>
          <h1>Lessons and system checks</h1>
        </div>
      </div>
      <div className="metrics">
        <Metric label="open tasks" value={tasks.length.toString()} />
        <Metric label="active projects" value={projects.length.toString()} />
        <Metric label="sessions" value={completedSessions.length.toString()} />
      </div>
      <form className="composer" onSubmit={onAddLesson}>
        <span className="prompt">&gt;</span>
        <input
          autoComplete="off"
          placeholder="new lesson"
          value={lessonText}
          onChange={(event) => onLessonTextChange(event.target.value)}
        />
        <button className="icon-button" title="add lesson">
          <Plus size={16} />
        </button>
      </form>
      <div className="list">
        {lessons.map((lesson) => (
          <div className="row compact" key={lesson.id}>
            <TimerReset size={16} />
            <div className="row-main static">
              <span>{lesson.text}</span>
              <small>
                {lesson.trigger} · {lesson.tags.join(", ")}
              </small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OverwhelmedMode({
  captureText,
  focusLesson,
  onCapture,
  onCaptureTextChange,
  onStartQuick,
  selectedTask,
}: {
  captureText: string;
  focusLesson?: Lesson;
  onCapture: (event: FormEvent) => void;
  onCaptureTextChange: (value: string) => void;
  onStartQuick: () => void;
  selectedTask?: Task;
}) {
  return (
    <section className="overwhelmed-panel">
      <p className="eyebrow">reduced mode</p>
      <h1>{selectedTask?.title ?? "Choose one small action"}</h1>
      <p className="lesson">{focusLesson?.text}</p>
      <button className="primary-action" onClick={onStartQuick}>
        <Play size={16} />
        <span>5 min</span>
      </button>
      <form className="composer narrow" onSubmit={onCapture}>
        <span className="prompt">&gt;</span>
        <input
          autoComplete="off"
          placeholder="capture distraction"
          value={captureText}
          onChange={(event) => onCaptureTextChange(event.target.value)}
        />
        <button className="icon-button" title="capture">
          <Plus size={16} />
        </button>
      </form>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
