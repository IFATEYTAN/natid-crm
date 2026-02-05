export default function Layout(props) {
  return (
    <PermissionsProvider>
      <LayoutContent {...props} />
    </PermissionsProvider>
  );
}