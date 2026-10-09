import React from 'react';
import { ArrowLeft, Clock3, PlayCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  return (
    <article className="course-card">
      <Link to={`/courses/${course.slug}`} className="course-thumb">
        <img src={course.thumbnail} alt={course.title} />
        <span className="thumb-badge"><PlayCircle size={15} /> شاهد التفاصيل</span>
      </Link>
      <div className="course-card-body">
        <div className="eyebrow-row"><span className="tag">{course.category}</span><span className="level">{course.level}</span></div>
        <h3><Link to={`/courses/${course.slug}`}>{course.title}</Link></h3>
        <p>{course.description}</p>
        <div className="course-meta"><span><Clock3 size={15} /> {course.duration}</span>{course.rating?<span><Star size={15} fill="currentColor" /> {course.rating}</span>:<span><PlayCircle size={15} /> {course.lessons||0} درس</span>}</div>
        <div className="course-footer"><strong>{course.price} ج.م</strong><Link className="text-link" to={`/courses/${course.slug}`}>استكشف <ArrowLeft size={16} /></Link></div>
      </div>
    </article>
  );
}
