import React from 'react';import { Link } from 'react-router-dom';import Button from '../components/Button';
export default function NotFound(){return <section className="not-found"><div><span>404</span><h1>الصفحة مش موجودة.</h1><p>يمكن الطريق اتغير، لكن رحلتك لسه مكملة.</p><Link to="/"><Button>العودة للرئيسية</Button></Link></div></section>}
