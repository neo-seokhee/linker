# 자동 피드 수집 시스템 설정 가이드

## 🎯 개요

RSS, 뉴스레터, API에서 자동으로 컨텐츠를 수집하여 Linker 피드에 게시하는 시스템입니다.

## 📋 설정 순서

### 1. 데이터베이스 테이블 생성

Supabase Dashboard > SQL Editor에서 다음 파일을 실행:

```bash
supabase_feed_sources.sql
```

이 스크립트는 다음을 생성합니다:
- `feed_sources` - 피드 소스 관리 테이블
- `feed_collection_logs` - 수집 로그 테이블

### 2. Supabase Edge Function 배포

```bash
# Supabase CLI 설치 (아직 안 했다면)
npm install -g supabase

# Supabase 로그인
supabase login

# Edge Function 배포
supabase functions deploy feed-collector --project-ref <YOUR_PROJECT_REF>
```

Edge Function URL 확인:
```
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/feed-collector
```

### 3. GitHub Secrets 설정

GitHub Repository > Settings > Secrets and variables > Actions에서 추가:

```
SUPABASE_FUNCTION_URL=https://<YOUR_PROJECT_REF>.supabase.co/functions/v1
SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
```

### 4. 어드민 패널에서 피드 소스 등록

1. 웹에서 `/admin` 접속
2. 왼쪽 사이드바에서 "피드 소스" 클릭
3. "새 피드 소스 추가" 폼 작성:
   - **소스 타입**: RSS, 뉴스레터, API 중 선택
   - **소스 이름**: 예) "TechCrunch", "GeekNews"
   - **URL**: RSS 피드 URL (예: `https://techcrunch.com/feed/`)
   - **에디터**: 기존 에디터 선택 또는 직접 입력
   - **카테고리**: 일반, 뉴스, 개발 등
   - **Boost 점수**: Top 10 랭킹 가중치
   - **수집 주기**: 몇 시간마다 수집할지
   - **최대 아이템 수**: 한 번에 수집할 최대 개수
   - **피드 표시**: 일반 피드에 표시 여부
   - **추천 표시**: Featured 섹션 표시 여부

4. "피드 소스 추가" 버튼 클릭

## 🔄 수집 자동화

GitHub Actions가 6시간마다 자동으로 실행됩니다 (`.github/workflows/feed-collector.yml`).

수집 주기 변경:
```yaml
schedule:
  - cron: '0 */3 * * *'  # 3시간마다
  - cron: '0 0 * * *'    # 매일 자정
```

## 🧪 수동 테스트

### Edge Function 직접 호출
```bash
curl -X POST "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/feed-collector" \
  -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json"
```

### GitHub Actions 수동 실행
1. GitHub Repository > Actions 탭
2. "Feed Collector" workflow 선택
3. "Run workflow" 버튼 클릭

## 📊 모니터링

### 어드민 패널에서 확인
- 각 피드 소스의 "마지막 수집" 시간 확인
- "📊 X개 수집" 배지로 총 수집 아이템 수 확인

### Supabase Dashboard에서 로그 확인
```sql
SELECT * FROM feed_collection_logs
ORDER BY collected_at DESC
LIMIT 20;
```

## 🌐 추천 RSS 소스

### 개발 & 기술 (RSS)
- **TechCrunch**: `https://techcrunch.com/feed/`
- **Hacker News**: `https://hnrss.org/frontpage`
- **The Verge**: `https://www.theverge.com/rss/index.xml`
- **44BITS**: `https://www.44bits.io/ko/rss.xml`
- **Dev.to**: `https://dev.to/feed`
- **Smashing Magazine**: `https://www.smashingmagazine.com/feed/`

### 한국 뉴스 (RSS)
- **조선일보 IT**: `https://www.chosun.com/arc/outboundfeeds/rss/category/it-science/`
- **연합뉴스 IT**: `https://www.yna.co.kr/rss/it.xml`

### 블로그 (RSS)
- **Medium**: `https://medium.com/feed/@username`
- **Velog (일반)**: `https://v2.velog.io/rss` (전체 인기 글, curated 전용 피드는 없음)
- **개인 블로그**: 대부분 `/feed` 또는 `/rss` 엔드포인트 제공

### 커뮤니티 (스크래퍼)
RSS가 없는 커뮤니티 게시판은 **스크래퍼** 타입으로 수집 가능:
- **클리앙 추천**: `https://www.clien.net/service/recommend` ✅ 지원
- **클리앙 인기글**: `https://www.clien.net/service/board/popular` ✅ 지원
- **뽐뿌**: `https://www.ppomppu.co.kr/hot.php`
- **디시인사이드**: 특정 갤러리 URL
- **에펨코리아**: `https://www.fmkorea.com/index.php?mid=best&listStyle=list`

**주의**:
- 스크래퍼는 기본 패턴으로 링크를 추출합니다.
- 클리앙(clien.net)은 특별히 최적화되어 정확한 게시글 제목과 링크를 수집합니다.
- 다른 사이트는 HTML 구조가 다를 수 있어 100% 완벽하지 않을 수 있습니다.
- **CSR 페이지 제한**: Velog Curated (`https://velog.io/curated`)처럼 JavaScript로 동적으로 컨텐츠를 로드하는 페이지는 스크래퍼로 수집 불가능합니다. 이런 경우 해당 사이트의 RSS 피드나 API를 대신 사용하세요.

## ⚙️ 고급 설정

### 키워드 필터링 (데이터베이스에서 직접)

```sql
-- "AI" 또는 "인공지능" 키워드 포함하는 게시물만 수집
UPDATE feed_sources
SET keywords_include = ARRAY['AI', '인공지능']
WHERE id = '<FEED_SOURCE_ID>';

-- "광고", "홍보" 키워드 제외
UPDATE feed_sources
SET keywords_exclude = ARRAY['광고', '홍보']
WHERE id = '<FEED_SOURCE_ID>';
```

### 피드 소스 일시 중지
어드민 패널에서 "일시정지" 버튼 클릭 또는:
```sql
UPDATE feed_sources
SET is_active = false
WHERE id = '<FEED_SOURCE_ID>';
```

## 🐛 문제 해결

### 1. Edge Function이 실행되지 않음
- Supabase Function URL이 정확한지 확인
- GitHub Secrets가 올바르게 설정되었는지 확인
- Edge Function 로그 확인: Supabase Dashboard > Edge Functions > Logs

### 2. RSS 파싱 실패
- RSS URL이 유효한지 브라우저에서 확인
- `feed_collection_logs` 테이블에서 에러 메시지 확인

### 3. 중복 아이템이 계속 수집됨
- URL 기반 중복 체크가 작동하지 않을 수 있음
- RSS 피드가 URL을 변경하는 경우 (쿼리 파라미터 등)

## 📝 다음 단계

- [ ] 이메일 뉴스레터 수집 기능 추가
- [ ] 이미지 자동 추출 개선
- [ ] 수집 통계 대시보드
- [ ] Slack/Discord 알림 통합

---

**문의사항이나 이슈가 있으면 GitHub Issues에 등록해주세요!**
