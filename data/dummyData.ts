// Dummy data for development and demo purposes
import { Link, Category, DEFAULT_CATEGORIES } from '@/constants/types';

export const dummyLinks: Link[] = [
    {
        id: '1',
        url: 'https://news.ycombinator.com/',
        ogTitle: 'Hacker News',
        ogImage: 'https://news.ycombinator.com/y18.svg',
        ogDescription: 'The best tech news and discussions',
        categoryId: 'news',
        createdAt: '2024-12-01T10:00:00Z',
        isFavorite: true,
    },
    {
        id: '2',
        url: 'https://www.coupang.com/',
        ogTitle: '쿠팡 - 로켓배송',
        ogImage: 'https://image8.coupangcdn.com/image/coupang/common/logo_coupang_w350.png',
        ogDescription: '로켓배송으로 빠르게 받아보세요',
        categoryId: 'shopping',
        createdAt: '2024-12-02T14:30:00Z',
        isFavorite: false,
    },
    {
        id: '3',
        url: 'https://velog.io/',
        ogTitle: 'velog - 개발자들을 위한 블로그',
        ogImage: 'https://velog.velcdn.com/images/velog/profile/8ad452b4-dd6f-41da-b44e-b30ea64c8c46/social.png',
        ogDescription: '개발자들의 이야기를 만나보세요',
        categoryId: 'articles',
        createdAt: '2024-12-03T09:15:00Z',
        isFavorite: true,
    },
    {
        id: '4',
        url: 'https://www.nytimes.com/',
        ogTitle: 'The New York Times',
        ogImage: 'https://static01.nyt.com/images/icons/t_logo_291_black.png',
        ogDescription: 'Breaking News, US News, World News',
        categoryId: 'news',
        createdAt: '2024-12-04T16:45:00Z',
        isFavorite: false,
    },
    {
        id: '5',
        url: 'https://www.11st.co.kr/',
        ogTitle: '11번가 - 대한민국 대표 온라인쇼핑몰',
        ogImage: 'https://cdn.11st.co.kr/img/logo/logo_11st_og.png',
        ogDescription: '쇼킹딜, 타임딜과 함께하는 쇼핑',
        categoryId: 'shopping',
        createdAt: '2024-12-05T11:20:00Z',
        isFavorite: false,
    },
    {
        id: '6',
        url: 'https://medium.com/',
        ogTitle: 'Medium - Where good ideas find you',
        ogImage: 'https://miro.medium.com/max/1200/1*jfdwtvU6V6g99q3G7gq7dQ.png',
        ogDescription: 'Read and share stories that matter',
        categoryId: 'articles',
        createdAt: '2024-12-06T08:00:00Z',
        isFavorite: true,
    },
    {
        id: '7',
        url: 'https://techcrunch.com/',
        ogTitle: 'TechCrunch – Startup and Technology News',
        ogImage: 'https://techcrunch.com/wp-content/uploads/2018/04/tc-logo-2018-square-reverse.png',
        ogDescription: 'Reporting on the business of technology',
        categoryId: 'news',
        createdAt: '2024-12-07T13:10:00Z',
        isFavorite: false,
    },
    {
        id: '8',
        url: 'https://brunch.co.kr/',
        ogTitle: '브런치스토리 - 좋은 글이 모인다',
        ogImage: 'https://brunch.co.kr/img/og/brunch_og_image_v2.png',
        ogDescription: '작가들의 글이 모여있는 공간',
        categoryId: 'articles',
        createdAt: '2024-12-08T19:30:00Z',
        isFavorite: false,
    },
];

export const dummyUser = {
    id: 'demo-user-1',
    email: 'demo@linker.app',
    name: 'Demo User',
};

export { DEFAULT_CATEGORIES };
