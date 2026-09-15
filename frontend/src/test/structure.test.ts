// frontend/CLAUDE.md의 파일 생성 규칙을 검사한다.
import { expect, test } from 'vitest'

const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const allPaths = Object.keys(import.meta.glob('/src/**/*'))
const cssPaths = Object.keys(import.meta.glob('/src/**/*.css'))

/**
 * 파일이 속한 페이지 폴더.
 * pages/login/LoginPage.tsx → "login", pages/admin/users/UserListPage.tsx → "admin/users"
 */
function pageFolderOf(path: string): string | null {
  const match = /^\/src\/pages\/(.+)$/.exec(path)
  if (!match) {
    return null
  }
  const [section, second] = match[1].split('/')
  const sectionHasOwnFiles = allPaths.some(
    (p) => p.startsWith(`/src/pages/${section}/`) && p.split('/').length === 5,
  )
  return sectionHasOwnFiles || second === undefined ? section : `${section}/${second}`
}

function relativeImports(path: string): string[] {
  const code = sources[path]
  const specifiers = [...code.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1])
  return specifiers.map((specifier) => {
    const parts = path.split('/').slice(0, -1)
    for (const segment of specifier.split('/')) {
      if (segment === '..') {
        parts.pop()
      } else if (segment !== '.') {
        parts.push(segment)
      }
    }
    return parts.join('/')
  })
}

test('CSS는 Sass로 작성한다 (.css 파일 금지)', () => {
  expect(cssPaths).toEqual([])
})

test('폴더 이름은 소문자로 쓴다', () => {
  const folders = new Set(allPaths.flatMap((p) => p.split('/').slice(2, -1)))
  expect([...folders].filter((name) => !/^[a-z][a-z0-9-]*$/.test(name))).toEqual([])
})

test('pages/와 shared/components/의 컴포넌트 파일 이름은 PascalCase로 쓴다', () => {
  const bad = Object.keys(sources).filter(
    (p) =>
      /^\/src\/(pages|shared\/components)\//.test(p) &&
      p.endsWith('.tsx') &&
      !/\/[A-Z][A-Za-z0-9]*(\.test)?\.tsx$/.test(p),
  )
  expect(bad).toEqual([])
})

test('한 페이지 폴더의 파일을 다른 페이지 폴더에서 import하지 않는다', () => {
  const violations = Object.keys(sources).flatMap((path) => {
    const own = pageFolderOf(path)
    if (own === null) {
      return []
    }
    return relativeImports(path)
      .filter((target) => {
        const other = pageFolderOf(target)
        return other !== null && other !== own
      })
      .map((target) => `${path} → ${target}`)
  })
  expect(violations).toEqual([])
})

test('shared/는 pages/를 import하지 않는다', () => {
  const violations = Object.keys(sources)
    .filter((path) => path.startsWith('/src/shared/'))
    .flatMap((path) =>
      relativeImports(path)
        .filter((target) => target.startsWith('/src/pages/'))
        .map((target) => `${path} → ${target}`),
    )
  expect(violations).toEqual([])
})
