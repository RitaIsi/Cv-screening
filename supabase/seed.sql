-- ==============================================================================
-- HireMatch: Seed Data (8 Realistic Jobs)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Sign up on HireMatch as a "Recruiter" first so that your user profile exists.
-- 2. Open your Supabase Dashboard -> SQL Editor.
-- 3. Run this script! It will automatically assign these 8 seed jobs to your recruiter account.
--    (If multiple recruiters exist, it will attach to the most recent recruiter).
-- ==============================================================================

DO $$
DECLARE
  target_recruiter_id UUID;
BEGIN
  -- Find the most recent recruiter ID from public.profiles
  SELECT id INTO target_recruiter_id 
  FROM public.profiles 
  WHERE role = 'recruiter' 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF target_recruiter_id IS NULL THEN
    RAISE NOTICE 'NOTICE: No recruiter account was found in public.profiles. Please sign up as a Recruiter in the HireMatch app first, then re-run this seed script.';
  ELSE
    RAISE NOTICE 'Seeding 8 jobs for Recruiter ID: %', target_recruiter_id;

    -- 1. Senior Frontend Engineer
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'Senior Frontend Engineer',
      'Acme Labs',
      'Remote',
      'Full-time',
      'We are looking for a Senior Frontend Engineer to build high-performance, responsive web interfaces using modern React and TypeScript. You will work closely with designers and product managers to craft seamless user experiences, build modular component libraries, and optimize web vitals.',
      ARRAY['React', 'TypeScript', 'CSS', 'Next.js', 'Redux', 'HTML'],
      4
    );

    -- 2. Full Stack Developer
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'Full Stack Developer',
      'Horizon Technologies',
      'New York, NY',
      'Hybrid',
      'Join our core product team building scalable web applications. You will develop modern React interfaces and resilient Node.js microservices backed by PostgreSQL. Strong familiarity with RESTful APIs, authentication workflows, and relational database schema design is required.',
      ARRAY['React', 'Node.js', 'PostgreSQL', 'JavaScript', 'REST APIs', 'Docker'],
      3
    );

    -- 3. Machine Learning Engineer
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'Machine Learning Engineer',
      'Cognitive AI',
      'San Francisco, CA',
      'Full-time',
      'Help build next-generation NLP and recommendation systems. You will develop, evaluate, and deploy machine learning models in Python, fine-tune transformer models, and integrate intelligent inference pipelines into production services.',
      ARRAY['Python', 'PyTorch', 'TensorFlow', 'NLP', 'Machine Learning', 'Scikit-Learn'],
      3
    );

    -- 4. DevOps & Cloud Architect
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'DevOps & Cloud Architect',
      'CloudScale Infrastructure',
      'Austin, TX',
      'Full-time',
      'We are seeking an experienced DevOps professional to lead our multi-region AWS cloud infrastructure, configure Kubernetes clusters, automate CI/CD pipelines, and implement infrastructure as code with Terraform.',
      ARRAY['AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Linux'],
      5
    );

    -- 5. UI/UX Product Designer
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'UI/UX Product Designer',
      'Studio Minimal',
      'London, UK',
      'Remote',
      'Define visual systems and intuitive user journeys for web and mobile products. You will conduct user research, craft wireframes and interactive Figma prototypes, and partner directly with engineering teams to ensure pixel-perfect CSS execution.',
      ARRAY['Figma', 'UI/UX Design', 'Wireframing', 'Design Systems', 'CSS', 'User Research'],
      2
    );

    -- 6. Data Analyst & BI Specialist
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'Data Analyst & BI Specialist',
      'MetricWorks Analytics',
      'Boston, MA',
      'Full-time',
      'Transform complex product and business data into clear, actionable insights and visual dashboards. You will write complex SQL queries, analyze trends using Python, and maintain executive Tableau dashboards.',
      ARRAY['SQL', 'Python', 'Tableau', 'Power BI', 'Data Analysis', 'Statistics'],
      2
    );

    -- 7. Junior Software Developer
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'Junior Software Developer',
      'Launchpad Software',
      'Chicago, IL',
      'Full-time',
      'An exciting opportunity for recent graduates or early-career developers. You will learn best software practices while contributing to feature development using modern JavaScript, React, HTML, and Git within an agile team.',
      ARRAY['JavaScript', 'React', 'HTML', 'CSS', 'Git'],
      1
    );

    -- 8. Backend Systems Engineer
    INSERT INTO public.jobs (
      recruiter_id,
      title,
      company,
      location,
      job_type,
      description,
      required_skills,
      min_experience
    ) VALUES (
      target_recruiter_id,
      'Backend Systems Engineer',
      'Nexus Systems',
      'Berlin, Germany',
      'Remote',
      'Architect robust backend services, high-throughput distributed message queues, and low-latency APIs. You will write clean, idiomatic Go and maintain Redis caching and PostgreSQL persistence layers.',
      ARRAY['Go', 'PostgreSQL', 'Redis', 'Microservices', 'Docker', 'Kafka'],
      4
    );

    RAISE NOTICE 'Successfully inserted 8 seed jobs!';
  END IF;
END $$;
