// =============================================================
// GREENPULSE — useProjects hook
// =============================================================

import { useState, useEffect, useCallback } from 'react';
import { projectsApi, CreateProjectDto, UpdateProjectDto, ListProjectsParams } from '../api/projects.api';
import { useProjectStore } from '../store/useProjectStore';
import { Project, ApiError } from '../types';

interface UseProjectsOptions extends ListProjectsParams {
  autoFetch?: boolean;
}

interface UseProjectsReturn {
  projects: Project[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProject: (dto: CreateProjectDto) => Promise<Project | null>;
  updateProject: (id: string, dto: UpdateProjectDto) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { autoFetch = true, ...queryParams } = options;
  const { projects, setProjects, addProject, updateProject: storeUpdate, removeProject } = useProjectStore();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await projectsApi.list(queryParams);
      setProjects(result.data);
      setTotal(result.total);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de charger les projets');
    } finally {
      setLoading(false);
    }
  }, [queryParams.isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFetch) {
      fetchProjects();
    }
  }, [fetchProjects, autoFetch]);

  const createProject = useCallback(async (dto: CreateProjectDto): Promise<Project | null> => {
    try {
      const project = await projectsApi.create(dto);
      addProject(project);
      setTotal((t) => t + 1);
      return project;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de créer le projet');
      return null;
    }
  }, [addProject]);

  const updateProject = useCallback(async (id: string, dto: UpdateProjectDto): Promise<Project | null> => {
    try {
      const updated = await projectsApi.update(id, dto);
      storeUpdate(id, updated);
      return updated;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de mettre à jour le projet');
      return null;
    }
  }, [storeUpdate]);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      await projectsApi.delete(id);
      removeProject(id);
      setTotal((t) => Math.max(0, t - 1));
      return true;
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Impossible de supprimer le projet');
      return false;
    }
  }, [removeProject]);

  return {
    projects,
    total,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
