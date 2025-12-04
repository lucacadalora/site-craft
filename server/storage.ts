import { 
  InsertProject, 
  Project, 
  InsertTemplate, 
  Template, 
  InsertUser, 
  User,
  InsertDeployment,
  Deployment,
  InsertProjectVersion,
  ProjectVersion
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  updateUserTokenUsage(id: number, tokenCount: number): Promise<User>;

  // Template methods
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplatesByCategory(category: string): Promise<Template[]>;
  getAllTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<Template>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getUserProjects(userId: number): Promise<Project[]>;
  getUserProjectsSummary(userId: number, limit?: number, offset?: number): Promise<{
    projects: Pick<Project, 'id' | 'sessionId' | 'slug' | 'name' | 'thumbnail' | 'published' | 'publishPath' | 'createdAt' | 'updatedAt'>[];
    total: number;
  }>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Deployment methods
  getDeploymentBySlug(slug: string): Promise<Deployment | undefined>;
  getUserDeployments(userId: number): Promise<Deployment[]>;
  getAllDeployments(): Promise<Deployment[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: number, deployment: Partial<Deployment>): Promise<Deployment>;
  deleteDeployment(id: number): Promise<void>;
  incrementDeploymentVisitCount(id: number): Promise<Deployment>;
  isSlugAvailable(slug: string): Promise<boolean>;

  // Project version methods - Similar to v3's commit tracking
  getProjectVersions(projectId: number): Promise<ProjectVersion[]>;
  getProjectVersion(id: number): Promise<ProjectVersion | undefined>;
  getLatestProjectVersion(projectId: number): Promise<ProjectVersion | undefined>;
  createProjectVersion(version: InsertProjectVersion): Promise<ProjectVersion>;
  deleteProjectVersion(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private templates: Map<string, Template>;
  private projects: Map<number, Project>;
  private deployments: Map<number, Deployment>;
  private projectVersions: Map<number, ProjectVersion>;
  private userId: number;
  private projectId: number;
  private deploymentId: number;
  private versionId: number;

  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.projects = new Map();
    this.deployments = new Map();
    this.projectVersions = new Map();
    this.userId = 1;
    this.projectId = 1;
    this.deploymentId = 1;
    this.versionId = 1;

    // Initialize with sample templates
    this.initializeTemplates();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      tokenUsage: 0,
      generationCount: 0,
      createdAt: new Date(),
      lastLogin: null,
      displayName: insertUser.displayName || null,
      username: insertUser.username || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      ...userData,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserTokenUsage(id: number, tokenCount: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      tokenUsage: (user.tokenUsage || 0) + tokenCount,
      generationCount: (user.generationCount || 0) + 1,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Template methods
  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async getTemplatesByCategory(category: string): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(
      (template) => template.category === category
    );
  }

  async getAllTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const newTemplate: Template = {
      ...template,
      description: template.description || null,
      thumbnail: template.thumbnail || null
    };
    this.templates.set(template.id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: string, templateUpdate: Partial<Template>): Promise<Template> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }

    const updatedTemplate: Template = {
      ...template,
      ...templateUpdate,
    };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    if (!this.templates.has(id)) {
      throw new Error(`Template with ID ${id} not found`);
    }
    this.templates.delete(id);
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectBySlug(slug: string): Promise<Project | undefined> {
    return Array.from(this.projects.values()).find(
      (project) => project.slug === slug
    );
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getUserProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.userId === userId
    );
  }

  async getUserProjectsSummary(userId: number, limit: number = 50, offset: number = 0): Promise<{
    projects: Pick<Project, 'id' | 'sessionId' | 'slug' | 'name' | 'thumbnail' | 'published' | 'publishPath' | 'createdAt' | 'updatedAt'>[];
    total: number;
  }> {
    const allProjects = Array.from(this.projects.values())
      .filter((project) => project.userId === userId)
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
    
    const paginatedProjects = allProjects.slice(offset, offset + limit).map(p => ({
      id: p.id,
      sessionId: p.sessionId,
      slug: p.slug,
      name: p.name,
      thumbnail: p.thumbnail,
      published: p.published,
      publishPath: p.publishPath,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    
    return {
      projects: paginatedProjects,
      total: allProjects.length
    };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const newProject: Project = {
      ...project,
      id,
      html: null,
      css: null,
      description: project.description || null,
      sessionId: project.sessionId || null,
      slug: project.slug || null,
      thumbnail: project.thumbnail || null,
      files: project.files || null,
      prompts: project.prompts || null,
      currentCommit: project.currentCommit || null,
      settings: project.settings || {},
      published: false,
      publishPath: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: project.userId || null
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found`);
    }

    const updatedProject: Project = {
      ...project,
      ...projectUpdate,
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    if (!this.projects.has(id)) {
      throw new Error(`Project with ID ${id} not found`);
    }
    this.projects.delete(id);
  }
  
  // Deployment methods
  async getDeploymentBySlug(slug: string): Promise<Deployment | undefined> {
    return Array.from(this.deployments.values()).find(
      (deployment) => deployment.slug === slug
    );
  }

  async getUserDeployments(userId: number): Promise<Deployment[]> {
    return Array.from(this.deployments.values()).filter(
      (deployment) => deployment.userId === userId
    );
  }

  async getAllDeployments(): Promise<Deployment[]> {
    return Array.from(this.deployments.values());
  }

  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    const id = this.deploymentId++;
    const now = new Date();
    
    // Ensure we have all required fields with proper types
    const newDeployment: Deployment = {
      id,
      slug: deployment.slug,
      html: deployment.html,
      css: deployment.css || null,
      projectId: deployment.projectId || null,
      userId: deployment.userId || null,
      isActive: deployment.isActive === undefined ? true : deployment.isActive,
      visitCount: 0,
      createdAt: now,
      updatedAt: now,
      lastVisitedAt: null
    };
    
    this.deployments.set(id, newDeployment);
    return newDeployment;
  }

  async updateDeployment(id: number, deploymentUpdate: Partial<Deployment>): Promise<Deployment> {
    const deployment = this.deployments.get(id);
    if (!deployment) {
      throw new Error(`Deployment with ID ${id} not found`);
    }

    const updatedDeployment: Deployment = {
      ...deployment,
      ...deploymentUpdate,
      updatedAt: new Date()
    };
    
    this.deployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  async deleteDeployment(id: number): Promise<void> {
    if (!this.deployments.has(id)) {
      throw new Error(`Deployment with ID ${id} not found`);
    }
    this.deployments.delete(id);
  }

  async incrementDeploymentVisitCount(id: number): Promise<Deployment> {
    const deployment = this.deployments.get(id);
    if (!deployment) {
      throw new Error(`Deployment with ID ${id} not found`);
    }

    const updatedDeployment: Deployment = {
      ...deployment,
      visitCount: (deployment.visitCount || 0) + 1,
      lastVisitedAt: new Date(),
      updatedAt: new Date()
    };
    
    this.deployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const deployment = await this.getDeploymentBySlug(slug);
    return !deployment;
  }

  // Initialize templates
  private initializeTemplates() {
    // Education templates
    this.createTemplate({
      id: "education-modern",
      name: "Modern Education",
      description: "Clean design with feature blocks",
      category: "education",
      thumbnail: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      html: `
        <header>
          <div class="container">
            <h1>Education Template</h1>
          </div>
        </header>
        <section class="hero">
          <div class="container">
            <h1>Learn with Us</h1>
            <p>Gain the skills you need to succeed</p>
            <a href="#" class="button">Get Started</a>
          </div>
        </section>
        <section class="features">
          <div class="container">
            <h2>Our Features</h2>
            <div class="feature-grid">
              <div class="feature">
                <h3>Expert Teachers</h3>
                <p>Learn from industry professionals</p>
              </div>
              <div class="feature">
                <h3>Flexible Learning</h3>
                <p>Study at your own pace</p>
              </div>
              <div class="feature">
                <h3>Certifications</h3>
                <p>Earn recognized credentials</p>
              </div>
            </div>
          </div>
        </section>
      `,
      css: `
        body { font-family: 'Inter', sans-serif; margin: 0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: #3b82f6; color: white; padding: 1rem 0; }
        .hero { padding: 4rem 0; background: #f0f9ff; text-align: center; }
        .features { padding: 4rem 0; }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .feature { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; }
      `,
    });

    this.createTemplate({
      id: "education-classic",
      name: "Classic Academy",
      description: "Traditional layout with testimonials",
      category: "education",
      thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      html: `
        <header>
          <div class="container">
            <h1>Classic Academy</h1>
          </div>
        </header>
        <section class="hero">
          <div class="container">
            <h1>Traditional Education</h1>
            <p>Excellence in learning since 1990</p>
            <a href="#" class="button">Learn More</a>
          </div>
        </section>
        <section class="about">
          <div class="container">
            <h2>About Us</h2>
            <p>We provide high-quality education with a focus on traditional values and modern methods.</p>
          </div>
        </section>
        <section class="testimonials">
          <div class="container">
            <h2>What Our Students Say</h2>
            <div class="testimonial">
              <p>"The best education I've ever received."</p>
              <p class="author">- John D., Graduate</p>
            </div>
          </div>
        </section>
      `,
      css: `
        body { font-family: 'Poppins', serif; margin: 0; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: #1a365d; color: white; padding: 1rem 0; }
        .hero { padding: 4rem 0; background: #f8fafc; text-align: center; }
        .about { padding: 4rem 0; background: white; }
        .testimonials { padding: 4rem 0; background: #f1f5f9; }
        .testimonial { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 2rem; }
        .author { font-style: italic; }
        .button { display: inline-block; background: #1a365d; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; }
      `,
    });

    // Portfolio templates
    this.createTemplate({
      id: "portfolio-minimal",
      name: "Minimal Portfolio",
      description: "Clean, minimalist design for creatives",
      category: "portfolio",
      thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      html: `
        <header>
          <div class="container">
            <h1>Jane Doe</h1>
            <p>Designer & Photographer</p>
          </div>
        </header>
        <section class="hero">
          <div class="container">
            <h1>Creating Stunning Visuals</h1>
            <p>Portfolio of selected works</p>
          </div>
        </section>
        <section class="portfolio">
          <div class="container">
            <h2>My Work</h2>
            <div class="portfolio-grid">
              <div class="portfolio-item">Project 1</div>
              <div class="portfolio-item">Project 2</div>
              <div class="portfolio-item">Project 3</div>
              <div class="portfolio-item">Project 4</div>
            </div>
          </div>
        </section>
        <section class="contact">
          <div class="container">
            <h2>Get in Touch</h2>
            <p>Email: hello@example.com</p>
          </div>
        </section>
      `,
      css: `
        body { font-family: 'Inter', sans-serif; margin: 0; color: #333; background: #f9fafb; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { padding: 2rem 0; background: white; }
        .hero { padding: 6rem 0; text-align: center; }
        .portfolio { padding: 4rem 0; }
        .portfolio-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .portfolio-item { background: white; height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .contact { padding: 4rem 0; background: white; text-align: center; }
      `,
    });

    // Finance templates
    this.createTemplate({
      id: "finance-professional",
      name: "Professional Finance",
      description: "Trustworthy design for financial services",
      category: "finance",
      thumbnail: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      html: `
        <header>
          <div class="container">
            <h1>Finance Pro</h1>
          </div>
        </header>
        <section class="hero">
          <div class="container">
            <h1>Financial Solutions for Your Future</h1>
            <p>Expert advice and personalized service</p>
            <a href="#" class="button">Schedule a Consultation</a>
          </div>
        </section>
        <section class="services">
          <div class="container">
            <h2>Our Services</h2>
            <div class="services-grid">
              <div class="service">
                <h3>Investment Planning</h3>
                <p>Build a diversified portfolio</p>
              </div>
              <div class="service">
                <h3>Retirement Planning</h3>
                <p>Secure your future today</p>
              </div>
              <div class="service">
                <h3>Tax Strategy</h3>
                <p>Optimize your tax position</p>
              </div>
            </div>
          </div>
        </section>
      `,
      css: `
        body { font-family: 'Inter', sans-serif; margin: 0; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: #0f172a; color: white; padding: 1rem 0; }
        .hero { padding: 4rem 0; background: #f8fafc; text-align: center; }
        .services { padding: 4rem 0; background: white; }
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .service { background: #f8fafc; border-radius: 8px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .button { display: inline-block; background: #0f172a; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; }
      `,
    });

    // Marketplace templates
    this.createTemplate({
      id: "marketplace-modern",
      name: "Modern Marketplace",
      description: "Clean design for online marketplaces",
      category: "marketplace",
      thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      html: `
        <header>
          <div class="container">
            <h1>MarketHub</h1>
          </div>
        </header>
        <section class="hero">
          <div class="container">
            <h1>Shop Local, Connect Global</h1>
            <p>The marketplace for unique products</p>
            <a href="#" class="button">Start Shopping</a>
          </div>
        </section>
        <section class="categories">
          <div class="container">
            <h2>Categories</h2>
            <div class="categories-grid">
              <div class="category">Handmade</div>
              <div class="category">Vintage</div>
              <div class="category">Craft Supplies</div>
              <div class="category">Digital Products</div>
            </div>
          </div>
        </section>
        <section class="featured">
          <div class="container">
            <h2>Featured Products</h2>
            <div class="products-grid">
              <div class="product">
                <h3>Product 1</h3>
                <p>$29.99</p>
              </div>
              <div class="product">
                <h3>Product 2</h3>
                <p>$39.99</p>
              </div>
              <div class="product">
                <h3>Product 3</h3>
                <p>$19.99</p>
              </div>
            </div>
          </div>
        </section>
      `,
      css: `
        body { font-family: 'Inter', sans-serif; margin: 0; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: #4f46e5; color: white; padding: 1rem 0; }
        .hero { padding: 4rem 0; background: #eef2ff; text-align: center; }
        .categories { padding: 4rem 0; background: white; }
        .categories-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .category { background: #f3f4f6; padding: 1.5rem; border-radius: 8px; text-align: center; }
        .featured { padding: 4rem 0; background: #f9fafb; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
        .product { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .button { display: inline-block; background: #4f46e5; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; }
      `,
    });

    // General project templates
    this.createTemplate({
      id: "general-startup",
      name: "Modern Startup",
      description: "Clean design for startups and SaaS",
      category: "general",
      thumbnail: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80",
      html: `
        <header>
          <div class="container">
            <h1>StartupName</h1>
          </div>
        </header>
        <section class="hero">
          <div class="container">
            <h1>The Solution You've Been Waiting For</h1>
            <p>Simplify your workflow and boost productivity</p>
            <a href="#" class="button">Get Started Free</a>
          </div>
        </section>
        <section class="features">
          <div class="container">
            <h2>Key Features</h2>
            <div class="features-grid">
              <div class="feature">
                <h3>Easy to Use</h3>
                <p>Intuitive interface for all users</p>
              </div>
              <div class="feature">
                <h3>Powerful Analytics</h3>
                <p>Gain insights from your data</p>
              </div>
              <div class="feature">
                <h3>Team Collaboration</h3>
                <p>Work together seamlessly</p>
              </div>
            </div>
          </div>
        </section>
        <section class="pricing">
          <div class="container">
            <h2>Simple Pricing</h2>
            <div class="pricing-grid">
              <div class="pricing-plan">
                <h3>Basic</h3>
                <p class="price">$9/mo</p>
                <ul>
                  <li>Core Features</li>
                  <li>Limited Usage</li>
                  <li>Email Support</li>
                </ul>
                <a href="#" class="button">Choose Plan</a>
              </div>
              <div class="pricing-plan">
                <h3>Pro</h3>
                <p class="price">$29/mo</p>
                <ul>
                  <li>All Features</li>
                  <li>Unlimited Usage</li>
                  <li>Priority Support</li>
                </ul>
                <a href="#" class="button">Choose Plan</a>
              </div>
            </div>
          </div>
        </section>
      `,
      css: `
        body { font-family: 'Inter', sans-serif; margin: 0; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: #6366f1; color: white; padding: 1rem 0; }
        .hero { padding: 4rem 0; background: #eef2ff; text-align: center; }
        .features { padding: 4rem 0; background: white; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .feature { padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); background: #f9fafb; }
        .pricing { padding: 4rem 0; background: #eef2ff; }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .pricing-plan { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .price { font-size: 1.5rem; font-weight: bold; margin: 1rem 0; }
        ul { list-style: none; padding: 0; }
        li { padding: 0.5rem 0; }
        .button { display: inline-block; background: #6366f1; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; }
      `,
    });
  }

  // Project version methods implementation
  async getProjectVersions(projectId: number): Promise<ProjectVersion[]> {
    return Array.from(this.projectVersions.values())
      .filter(v => v.projectId === projectId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async getProjectVersion(id: number): Promise<ProjectVersion | undefined> {
    return this.projectVersions.get(id);
  }

  async getLatestProjectVersion(projectId: number): Promise<ProjectVersion | undefined> {
    const versions = await this.getProjectVersions(projectId);
    return versions[0];
  }

  async createProjectVersion(version: InsertProjectVersion): Promise<ProjectVersion> {
    const id = this.versionId++;
    const newVersion: ProjectVersion = {
      ...version,
      id,
      createdAt: new Date(),
      commitTitle: version.commitTitle || null,
      isFollowUp: version.isFollowUp || false
    };
    this.projectVersions.set(id, newVersion);
    return newVersion;
  }

  async deleteProjectVersion(id: number): Promise<void> {
    this.projectVersions.delete(id);
  }
}

// Import PgStorage
import { PgStorage } from './db/pg-storage';

// For production, use PgStorage
// For development or if needed for compatibility, keep MemStorage available
export const storage = new PgStorage();
