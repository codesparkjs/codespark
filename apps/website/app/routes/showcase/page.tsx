import { ArrowUpRight, Code2, ExternalLink, GithubIcon, Layers, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { cn } from '~/lib/utils';

export function meta() {
  return [{ title: 'Showcase - codespark' }, { name: 'description', content: 'Edit and preview code in real-time.' }];
}

interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  category: 'component' | 'template' | 'integration';
  demoUrl?: string;
  sourceUrl?: string;
  featured?: boolean;
}

const projects: Project[] = [
  {
    id: 'codespark-playground',
    title: 'Codespark Playground',
    description: 'A full-featured code playground built with Codespark',
    image: '/showcase/live-editor.png',
    tags: ['React', 'Monaco', 'TypeScript', 'Playground', 'Codespark'],
    category: 'integration',
    demoUrl: 'https://codesparkjs.com/playground',
    sourceUrl: 'https://github.com/codesparkjs/codespark',
    featured: true
  },
  {
    id: 'shadcx-ui',
    title: 'shadcx/ui',
    description: 'shadcn/ui docs with interactive components, powered by Codespark',
    image: '/showcase/mdx-playground.png',
    tags: ['shadcn/ui', 'Components', 'Design System', 'Documentation', 'React', 'Codespark'],
    category: 'component',
    demoUrl: 'https://shadcx-ui.vercel.app',
    sourceUrl: 'https://github.com/codesparkjs/shadcx-ui',
    featured: true
  }
  // {
  //   id: 'vscodespark',
  //   title: 'VSCodespark',
  //   description: 'Build and preview your component library with live documentation.',
  //   image: '/showcase/component-library.png',
  //   tags: ['Components', 'Storybook', 'Design System'],
  //   category: 'template'
  // }
  // {
  //   id: 'itypora',
  //   title: 'iTypora',
  //   description: 'Instant Tailwind CSS preview with automatic class detection.',
  //   image: '/showcase/tailwind-preview.png',
  //   tags: ['Tailwind', 'CSS', 'Styling'],
  //   category: 'integration'
  // },
  // {
  //   id: 'api-explorer',
  //   title: 'API Explorer',
  //   description: 'Interactive API documentation with live request/response preview.',
  //   image: '/showcase/api-explorer.png',
  //   tags: ['API', 'REST', 'GraphQL'],
  //   category: 'template'
  // },
  // {
  //   id: 'theme-builder',
  //   title: 'Theme Builder',
  //   description: 'Visual theme customization with real-time component preview.',
  //   image: '/showcase/theme-builder.png',
  //   tags: ['Theming', 'CSS Variables', 'Design'],
  //   category: 'component'
  // }
];

const categories = [
  { id: 'all', label: 'All Projects', icon: Layers },
  { id: 'component', label: 'Components', icon: Code2 },
  { id: 'template', label: 'Templates', icon: Sparkles },
  { id: 'integration', label: 'Integrations', icon: ExternalLink }
] as const;

type CategoryId = (typeof categories)[number]['id'];

function ProjectCard({ project }: { project: Project }) {
  return (
    <div
      className={cn('group border-border bg-card relative flex flex-col overflow-hidden rounded-xl border border-dashed transition-all duration-300', 'hover:border-primary/50 hover:shadow-primary/5 hover:shadow-lg', project.featured && 'md:col-span-2')}>
      <div className="bg-muted relative aspect-video overflow-hidden">
        <div className="from-primary/20 to-primary/10 absolute inset-0 bg-linear-to-br via-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Code2 className="text-muted-foreground/30 size-12" />
        </div>
        <div className="from-background/80 absolute inset-0 bg-linear-to-t via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute right-4 bottom-4 left-4 flex translate-y-2 gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {project.demoUrl && (
            <Link to={project.demoUrl} className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
              View Demo
              <ArrowUpRight className="size-3.5" />
            </Link>
          )}
          {project.sourceUrl && (
            <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
              <GithubIcon className="size-3.5" />
              Source
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          {project.featured && (
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
              <Sparkles className="size-3" />
              Featured
            </span>
          )}
        </div>
        <h3 className="text-foreground group-hover:text-primary mb-2 text-lg font-semibold transition-colors">{project.title}</h3>
        <p className="text-muted-foreground mb-4 flex-1 text-sm leading-relaxed">{project.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map(tag => (
            <span key={tag} className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Showcase() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const filteredProjects = activeCategory === 'all' ? projects : projects.filter(p => p.category === activeCategory);

  return (
    <div className="px-6 pt-24 pb-14 *:mx-auto *:max-w-(--fd-layout-width)">
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map(category => {
            const Icon = category.icon;

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                  activeCategory === category.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}>
                <Icon className="size-4" />
                {category.label}
              </button>
            );
          })}
        </div>
      </section>
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </section>
      {filteredProjects.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">No projects found in this category.</p>
        </div>
      )}
    </div>
  );
}
