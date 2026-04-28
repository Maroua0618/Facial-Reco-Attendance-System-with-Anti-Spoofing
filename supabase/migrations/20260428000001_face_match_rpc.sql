-- Nearest-neighbour student lookup using pgvector cosine distance,
-- restricted to a single group (TD/TP cohort).

create or replace function match_student_embedding(q vector(512), g uuid, k int default 1)
returns table(student_id uuid, distance float)
language sql
stable
as $$
  select se.student_id, (se.embedding <=> q)::float as distance
  from student_embeddings se
  join student_groups sg on sg.student_id = se.student_id
  where sg.group_id = g
  order by se.embedding <=> q
  limit k
$$;

grant execute on function match_student_embedding(vector, uuid, int) to anon, authenticated, service_role;
