"use client";

import { useState } from "react";
import axios from "axios";
import {
  QueryClient, // creates a client for query management
  useQueryClient, // allows to manage the data cache (add/remove tasks without repeated request to the server)
  QueryClientProvider, // wraps the component so that it can use useQuery and useMutation
  useQuery, // fetches data from the server
  useMutation, // executes modifying requests (POST, DELETE)
} from "@tanstack/react-query";
import { FaTrash } from "react-icons/fa";

const fetchTasks = async () => {
  const res = await axios.get(
    "https://jsonplaceholder.typicode.com/todos?_limit=10"
  );
  return res.data;
};

const createTask = async (newTask) => {
  const res = await axios.post(
    "https://jsonplaceholder.typicode.com/todos",
    newTask
  );
  return res.data;
};

const deleteTask = async (id) => {
  await axios.delete(`https://jsonplaceholder.typicode.com/todos/${id}`);
  return id;
};

function TaskApp() {
  const [newTaskText, setNewTaskText] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const {
    data: tasks = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tasks"], // caching key
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 5, // data is updated every 5 min so it doesn't get lost
  });

  // Optimistic UI - creates a mutation to add a task
  const { mutate: addTask } = useMutation({
    mutationFn: createTask, // specifies the function that makes the request (POST)
    onMutate: async (newTask) => {
      // Suspend queries until we are ready to return the updated data to the cache
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Saves the current task data from the cache so that if the operation fails, we can restore the old data
      const previousTasks = queryClient.getQueryData(["tasks"]);

      // Refresh the cache by adding a new task to the top of the list
      queryClient.setQueryData(["tasks"], (oldTasks = []) => [
        { ...newTask, id: Date.now() }, // Temporary ID
        ...oldTasks,
      ]);

      return { previousTasks };
    },
    // return old data to the cache in case of an error
    onError: (_err, _newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },
  });

  const { mutate: removeTask } = useMutation({
    mutationFn: deleteTask,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      const previousTasks = queryClient.getQueryData(["tasks"]);
      queryClient.setQueryData(
        ["tasks"],
        (oldTasks) => oldTasks?.filter((task) => task.id !== id) || []
      );

      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },
  });

  const handleAddTask = async () => {
    if (newTaskText.trim()) {
      try {
        await addTask({ title: newTaskText, completed: false });
        setNewTaskText("");
        setError("");
      } catch (error) {
        setError("Failed to add task. Please try again.");
      }
    } else {
      setError("Field can't be empty");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await removeTask(id);
    } catch (error) {
      setError("Failed to delete task. Please try again.");
    }
  };  

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error during task loading</div>;

  return (
    <div className="w-screen max-w-full py-10 flex flex-col items-center overflow-hidden relative">
      <div className="big-circle"></div>
      <div className="small-circle"></div>
      <h1 className="text-4xl bg-amber-100 w-full text-center p-2 font-extrabold uppercase">
        Task management application (json)
      </h1>

      <div className="flex justify-center flex-col bg-amber-100 rounded-3xl p-5 px-8 mt-8 mx-12">
        <div className="px-0.5 pb-2 my-2">
          <h2 className="font-bold">Today</h2>
          <h3>
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
        </div>

        <div className="mb-4 flex justify-center items-center gap-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => {
              setNewTaskText(e.target.value);
              setError("");
            }}
            className="block w-full rounded-lg text-base bg-[#E8F0FE] focus:outline-none placeholder-black/50 p-3 py-2.5"
            placeholder="Add task here..."
          />
          <button
            onClick={handleAddTask}
            className="px-[11px] py-0.5 h-fit rounded-full active:scale-110 bg-green-600 text-white cursor-pointer"
          >
            <span className="text-3xl">+</span>
          </button>
        </div>
        {error && <p className="text-red-500/90 px-1 text-sm">{error}</p>}

        {tasks.length === 0 ? (
          <h2 className="p-1 pt-2 font-bold text-center text-xl">
            List is empty
          </h2>
        ) : (
          <ul className="flex flex-col items-center justify-center mt-4 text-center">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="w-full p-1 flex justify-between items-center gap-8 border-b-[1px]"
              >
                <span className={task.completed ? "line-through" : "none"}>
                  {task.title}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <FaTrash />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TaskApp />
    </QueryClientProvider>
  );
}
